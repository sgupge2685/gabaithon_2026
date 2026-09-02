import React from "react"; 
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
} from "react-native"; 
 
import { COLORS } from "../constants/colors"; 
 
interface ReactionButtonProps { 
  isRead: boolean; 
  reaction?: string; 
  onPress: () => void; 
} 
 
export default function ReactionButton({ 
  isRead, 
  reaction, 
  onPress, 
}: ReactionButtonProps) { 
  return ( 
    <TouchableOpacity 
      style={[ 
        styles.button, 
        isRead && styles.buttonActive, 
      ]} 
      onPress={onPress} 
      activeOpacity={0.8} 
      accessibilityRole="button" 
      accessibilityLabel="みたよ" 
    > 
      <Text 
        style={[ 
          styles.text, 
          isRead && styles.textActive, 
        ]} 
      > 
        {isRead ? "❤️ みたよ！" : "🤍 みたよ！"} 
      </Text> 
    </TouchableOpacity> 
  ); 
} 
 
const styles = StyleSheet.create({ 
  button: { 
    width: "100%", 
    minHeight: 68, 
 
    borderRadius: 18, 
 
    justifyContent: "center", 
    alignItems: "center", 
 
    backgroundColor: COLORS.likeLight, 
 
    borderWidth: 2, 
    borderColor: COLORS.like, 
  }, 
 
  buttonActive: { 
    backgroundColor: COLORS.like, 
  }, 
 
  text: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: COLORS.like, 
  }, 
 
  textActive: { 
    color: COLORS.white, 
  }, 
});