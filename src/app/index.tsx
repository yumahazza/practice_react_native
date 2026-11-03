import React, { useState } from "react";
import { Text, View, StyleSheet, Image, ScrollView } from "react-native";

export default function Index() {
  const [showImages, setShowImages] = useState(false);

  return (
    <ScrollView>
      <View style={styles.container}>
      <Text style={styles.text_head}>Hi, Nama saya Yuma Hazza Yuditama</Text>
      
      <Image
        source={require("../../assets/images/kimi_antonelli.webp")}
        style={styles.image}
      />

      <Text style={styles.text_subhead}>Kimi Antonelli merupakan pembalap Formula 1 termuda yang pada musim 2026 ini meraih gelar juara
        bersama   Mercedes-AMG Petronas Formula One Team. Kimi Antonelli lahir pada 20 Juli 2008 di Italia dan memulai kariernya di dunia balap sejak usia dini. 
        Ia dikenal sebagai salah satu talenta muda yang menjanjikan dalam dunia Formula 1, dengan kemampuan mengemudi yang luar biasa dan mental yang kuat di lintasan balap.
      </Text>

    </View>
    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    margin: 30,
  },
  text_head: {
    fontSize: 40,
    marginBottom: 10,
    fontWeight: "bold",
  },
  text_subhead: {
    fontSize: 18,
    marginBottom: 10,
  },
  image: {
    height: 300,
    width: 300,
    borderRadius: 8,
    margin: 8,
  },
});