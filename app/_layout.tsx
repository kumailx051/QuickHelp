import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { Provider } from "react-redux";
import store from "../src/store/store";
import "../src/localization/i18n";

const Layout = () => {
  return (
    <Provider store={store}>
      <StatusBar barStyle="dark-content" />
      <Stack />
    </Provider>
  );
};

export default Layout;
