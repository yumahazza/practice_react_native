import React, { useState } from "react";
import { Text, View, StyleSheet, Button, Image, ScrollView } from "react-native";

export default function Index() {
  const [showImages, setShowImages] = useState(false);

  const handleButtonPress = () => {
    setShowImages((prev) => !prev);
    console.log("Tombol ditekan!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text_head}>Jual Laptop</Text>
      <Text style={styles.text_subhead}>Laptop terbaik untuk kebutuhan Anda</Text>
      
      <Button 
        title={showImages ? "Sembunyikan Laptop" : "Lihat Laptop"} 
        onPress={handleButtonPress} 
      />

      {showImages && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.imageContainer}
        >
          {/* Laptop 1 */}
          <View style={styles.card}>
            <Image 
              source={require('../../assets/images/laptop1.webp')} 
              style={styles.image} 
            />
            <Text style={styles.cardTitle}>Laptop Kerja</Text>
            <Text style={styles.cardPrice}>Rp 19.500.000</Text>
          </View>

          {/* Laptop 2 */}
          <View style={styles.card}>
            <Image 
              source={require('../../assets/images/laptop2.webp')} 
              style={styles.image} 
            />
            <Text style={styles.cardTitle}>Laptop Kuliah</Text>
            <Text style={styles.cardPrice}>Rp 15.000.000</Text>
          </View>

          {/* Laptop 3 */}
          <View style={styles.card}>
            <Image 
              source={require('../../assets/images/laptop3.webp')} 
              style={styles.image} 
            />
            <Text style={styles.cardTitle}>Laptop Profesional</Text>
            <Text style={styles.cardPrice}>Rp 33.699.000</Text>
          </View>
        </ScrollView>
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
    fontSize: 40,
    marginBottom: 10,
    fontWeight: "bold",
  },
  text_subhead: {
    fontSize: 18,
    marginBottom: 10,
  },
  imageContainer: {
    alignItems: "center",
    gap: 16,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: "#c1d7f7",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardPrice: {
    fontSize: 14,
    color: "#0a336d",
    marginTop: 4,
    fontWeight: "600",
  },
});