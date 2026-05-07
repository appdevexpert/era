import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BaseToast,
  ErrorToast,
  type BaseToastProps,
  type ToastConfig,
} from "react-native-toast-message";
import { FONTS } from "@/app/constants/fonts";

const SuccessToast = (props: BaseToastProps) => {
  const { top } = useSafeAreaInsets();

  return (
    <BaseToast
      {...props}
      style={[styles.toastCard, { top: -top, backgroundColor: "#16C47F" }]}
      contentContainerStyle={[styles.toastContent, { paddingTop: top + 40 }]}
      text2Style={styles.toastText}
    />
  );
};

const ErrorToastComponent = (props: BaseToastProps) => {
  const { top } = useSafeAreaInsets();

  return (
    <ErrorToast
      {...props}
      style={[styles.toastCard, { top: -top, backgroundColor: "#FF4F4F" }]}
      contentContainerStyle={[styles.toastContent, { paddingTop: top + 40 }]}
      text2Style={styles.toastText2}
    />
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <SuccessToast {...props} />,
  error: (props) => <ErrorToastComponent {...props} />,
};

const styles = StyleSheet.create({
  toastCard: {
    borderLeftColor: "transparent",
    width: "100%",
    height: undefined,
    position: "absolute",
    backgroundColor: "#4CAF50",
    justifyContent: "center",
  },
  toastContent: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    width: "100%",
  },
  toastText: {
    alignSelf: "center",
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: "#fff",
    textAlign: "center",
    position: "absolute",
    bottom: 10,
  },
  toastText2: {
    alignSelf: "center",
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: "#fff",
    textAlign: "center",
    position: "absolute",
    marginBottom: 10,
    bottom: 10,
  },
});
