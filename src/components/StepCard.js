import { View } from "react-native";
import { StyleSheet } from "react-native";
const StepCard = ({ children }) => <View style={styles.card}>{children}</View>;

export default StepCard;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
});
