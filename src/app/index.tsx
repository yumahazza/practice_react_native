import React, { useState } from "react";
import { Text, View, StyleSheet, Button, Image } from "react-native";

export default function Index() {
  const [showImages, setShowImages] = useState(false);

  const handleButtonPress = () => {
    setShowImages(true);
    console.log("Tombol view laptop ditekan!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text_head}>Jual Laptop</Text>
      <Text style={styles.text_subhead}>Laptop terbaik untuk kebutuhan Anda</Text>
      <Button title="Lihat Laptop Terpopuler" onPress={handleButtonPress} />
      {showImages && (
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/laptop1.webp')} 
            style={styles.image} 
          />
          <Image 
            source={require('../../assets/images/laptop2.webp')} 
            style={styles.image} 
          />
          <Image 
            source={require('../../assets/images/laptop3.webp')} 
            style={styles.image} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  text_head: {
    fontSize: 30,
    marginBottom: 10,
    fontWeight: "bold",
  },
  text_subhead: {
    fontSize: 18,
    marginBottom: 10,
  },
  imageContainer: {
    marginTop: 20,
    alignItems: "center",
    gap: 20,
    flexDirection: "row",
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
});
