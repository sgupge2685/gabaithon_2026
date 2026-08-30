import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Image, 
  KeyboardAvoidingView, 
  Platform 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../constants/colors";

export default function CreateNewsScreen({ navigation }: any) {
  const [image, setImage] = useState<string | null>(null);
  const [memo, setMemo] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSend = () => {
    // ここでFirestoreにアップロードする処理が入ります
    alert("AIがニュースを生成して、おじいちゃんに送信します！");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.container}
      >
        <Text style={styles.heading}>新聞のネタを送る</Text>

        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <Text style={styles.imagePickerText}>📷 写真を選ぶ</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>ひと言メモ（AIが記事にします）</Text>
        
        <TextInput
          style={styles.input}
          placeholder="例：今日はプールで遊びました！"
          value={memo}
          onChangeText={setMemo}
          multiline
        />

        <TouchableOpacity
          style={[
            styles.sendButton, 
            (!image || !memo) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!image || !memo}
        >
          <Text style={styles.sendButtonText}>送信する</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  container: { 
    flex: 1, 
    padding: 24 
  },
  heading: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: COLORS.text, 
    marginBottom: 24, 
    marginTop: 10 
  },
  imagePicker: { 
    width: "100%", 
    height: 220, 
    backgroundColor: COLORS.card, 
    borderRadius: 16, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 24, 
    borderWidth: 2, 
    borderColor: COLORS.primaryLight, 
    borderStyle: "dashed" 
  },
  imagePickerText: { 
    fontSize: 18, 
    color: COLORS.primary, 
    fontWeight: "600" 
  },
  previewImage: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 16 
  },
  label: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: COLORS.text, 
    marginBottom: 12 
  },
  input: { 
    backgroundColor: COLORS.card, 
    borderRadius: 16, 
    padding: 16, 
    fontSize: 16, 
    minHeight: 100, 
    textAlignVertical: "top", 
    marginBottom: 32, 
    borderWidth: 1, 
    borderColor: "#E5E7EB" 
  },
  sendButton: { 
    width: "100%", 
    height: 60, 
    backgroundColor: COLORS.primary, 
    borderRadius: 16, 
    justifyContent: "center", 
    alignItems: "center", 
    elevation: 2 
  },
  sendButtonDisabled: { 
    backgroundColor: COLORS.disabled 
  },
  sendButtonText: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: COLORS.white 
  },
});