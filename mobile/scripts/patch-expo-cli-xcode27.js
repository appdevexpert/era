#!/usr/bin/env node
/**
 * Patches Expo SDK 54's @expo/cli so `expo run:ios` works on Xcode 27, which removed
 * Simulator.app and replaced it with Device Hub (bundle id `com.apple.dt.Devices`).
 *
 * Usage (from any Expo 54 project root):  node path/to/patch-expo-cli-xcode27.js [projectDir]
 *
 * Patches every @expo/cli copy under node_modules (the nested expo/node_modules copy is the
 * one `expo` actually runs). Safe to re-run; `npm install` wipes the patches, so run it again after.
 */
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(process.argv[2] || process.cwd());

const PATCHES = {
  'start/doctor/apple/SimulatorAppPrerequisite.js': [
    {
      name: 'Device Hub app id fallback',
      done: 'getDeviceHubAppIdAsync',
      find: `async function getSimulatorAppIdAsync() {
    return await getSimulatorAppIdViaAppleScriptAsync() ?? await getSimulatorAppIdFromBundleAsync();
}`,
      replace: `/**
 * Fallback for Xcode 27+, which removed Simulator.app entirely and replaced it with
 * Device Hub (bundle id \`com.apple.dt.Devices\`). Device Hub hosts both physical devices
 * and simulators, and simctl still drives the runtimes underneath.
 */ async function getDeviceHubAppIdAsync() {
    try {
        return (await (0, _osascript().execAsync)('id of app "DeviceHub"')).trim();
    } catch  {
    // Device Hub is not present either (Xcode 26 or older).
    }
    return null;
}
async function getSimulatorAppIdAsync() {
    return await getSimulatorAppIdViaAppleScriptAsync() ?? await getSimulatorAppIdFromBundleAsync() ?? await getDeviceHubAppIdAsync();
}`,
    },
    {
      name: 'allow Device Hub bundle id',
      done: "result !== 'com.apple.dt.Devices'",
      find: `result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {`,
      replace: `result !== 'com.apple.CoreSimulator.SimulatorTrampoline' && result !== 'com.apple.dt.Devices') {`,
    },
  ],
  'start/platforms/ios/ensureSimulatorAppRunning.js': [
    {
      name: 'detect Device Hub process',
      done: 'SIMULATOR_HOST_PROCESS_NAMES',
      find: `// I think the app can be open while no simulators are booted.
async function isSimulatorAppRunningAsync() {
    try {
        const zeroMeansNo = (await _osascript().execAsync('tell app "System Events" to count processes whose name is "Simulator"')).trim();
        if (zeroMeansNo === '0') {
            return false;
        }
    } catch (error) {
        if (error.message.includes('Application isn’t running')) {
            return false;
        }
        throw error;
    }
    return true;
}`,
      replace: `// Xcode 26 and older ship Simulator.app; Xcode 27+ replaced it with Device Hub.
const SIMULATOR_HOST_PROCESS_NAMES = [
    'Simulator',
    'DeviceHub'
];
// I think the app can be open while no simulators are booted.
async function isSimulatorAppRunningAsync() {
    for (const name of SIMULATOR_HOST_PROCESS_NAMES){
        try {
            const zeroMeansNo = (await _osascript().execAsync(\`tell app "System Events" to count processes whose name is "\${name}"\`)).trim();
            if (zeroMeansNo !== '0') {
                return true;
            }
        } catch (error) {
            if (!error.message.includes('Application isn’t running')) {
                throw error;
            }
        }
    }
    return false;
}`,
    },
    {
      name: 'open Device Hub fallback',
      done: "'com.apple.dt.Devices'",
      find: `    await (0, _spawnasync().default)('open', args);
}`,
      replace: `    try {
        await (0, _spawnasync().default)('open', args);
    } catch  {
        // Xcode 27+ removed Simulator.app. Device Hub is the replacement host UI; the device
        // itself is already booted through simctl by AppleDeviceManager, so just open the host.
        await (0, _spawnasync().default)('open', [
            '-b',
            'com.apple.dt.Devices'
        ]);
    }
}`,
    },
  ],
  'start/platforms/ios/AppleDeviceManager.js': [
    {
      name: 'activate Device Hub fallback',
      done: 'com.apple.dt.Devices',
      find: '        await _osascript().execAsync(`tell application "Simulator" to activate`);',
      replace: `        try {
            await _osascript().execAsync(\`tell application "Simulator" to activate\`);
        } catch  {
            // Xcode 27+ removed Simulator.app; Device Hub hosts simulators instead.
            await _osascript().execAsync(\`tell application id "com.apple.dt.Devices" to activate\`);
        }`,
    },
  ],
  'run/ios/appleDevice/client/LockdowndClient.js': [
    {
      // Physical devices: the pair record is a null-prototype object, so the template string throws.
      name: 'startSession debug crash',
      done: "debug('startSession');",
      find: 'debug(`startSession: ${pairRecord}`);',
      replace: "debug('startSession');",
      optional: true, // already fixed upstream in @expo/cli 54.0.25+
    },
  ],
};

function listDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

// Walks a node_modules dir and every nested node_modules inside its packages.
function findExpoCliCopies(nodeModules, found = []) {
  const cli = path.join(nodeModules, '@expo', 'cli');
  if (fs.existsSync(path.join(cli, 'build/src'))) found.push(cli);
  for (const name of listDirs(nodeModules)) {
    const pkgs = name.startsWith('@') ? listDirs(path.join(nodeModules, name)).map((n) => path.join(name, n)) : [name];
    for (const pkg of pkgs) findExpoCliCopies(path.join(nodeModules, pkg, 'node_modules'), found);
  }
  return found;
}

const copies = findExpoCliCopies(path.join(projectDir, 'node_modules'));
if (copies.length === 0) {
  console.error(`No @expo/cli found under ${projectDir}/node_modules — run npm install first.`);
  process.exit(1);
}

let failed = false;
for (const cli of copies) {
  const version = JSON.parse(fs.readFileSync(path.join(cli, 'package.json'), 'utf8')).version;
  console.log(`\n@expo/cli ${version}  (${path.relative(projectDir, cli)})`);
  if (!version.startsWith('54.')) console.warn('  ! not SDK 54 — patches were written for 54.0.x');
  for (const [rel, patches] of Object.entries(PATCHES)) {
    const file = path.join(cli, 'build/src', rel);
    if (!fs.existsSync(file)) {
      console.warn(`  ! missing ${rel}`);
      failed = true;
      continue;
    }
    let src = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const p of patches) {
      if (src.includes(p.done)) {
        console.log(`  = ${p.name} (already applied)`);
      } else if (src.includes(p.find)) {
        src = src.replace(p.find, p.replace);
        changed = true;
        console.log(`  + ${p.name}`);
      } else if (p.optional) {
        console.log(`  = ${p.name} (not needed in this version)`);
      } else {
        console.warn(`  ! ${p.name}: code not found, patch by hand`);
        failed = true;
      }
    }
    if (changed) fs.writeFileSync(file, src);
  }
}
process.exit(failed ? 1 : 0);
