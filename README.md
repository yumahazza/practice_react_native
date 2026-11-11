# Aplikasi Firebase Mahasiswa

Aplikasi React Native dengan Expo Router untuk login Google melalui Firebase Authentication serta melihat dan mengelola daftar mahasiswa di Cloud Firestore.

## Fitur

1. Login Google menggunakan ID token dan Firebase Authentication.
2. Sesi Firebase dipulihkan pada perangkat; ID token dan profil juga disimpan di AsyncStorage.
3. Halaman login dilewati hanya jika Firebase memulihkan pengguna yang masih login. Token lokal lama saja tidak cukup.
4. Data mahasiswa ditambah dan dihapus dari koleksi Cloud Firestore `mahasiswa`.
5. Beranda menampilkan daftar mahasiswa secara realtime dari Cloud Firestore.

## Konfigurasi Firebase dan Google

1. Buat project di [Firebase Console](https://console.firebase.google.com/), tambahkan aplikasi Web, lalu salin konfigurasi Firebase.
2. Aktifkan **Authentication > Sign-in method > Google**.
3. Buat database melalui **Firestore Database**. Aplikasi menggunakan koleksi `mahasiswa` dengan field `nim`, `nama`, `jurusan`, `angkatan`, dan `createdAt`.
4. Buat file `.env` di direktori proyek berdasarkan `.env.example`, lalu isi kredensial Firebase dan Google OAuth Client ID yang sesuai. File `.env` tidak boleh dimasukkan ke Git.
5. Pastikan aturan Firestore hanya mengizinkan pengguna yang terautentikasi membaca dan menulis koleksi. Contoh aturan awal:

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /mahasiswa/{document} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

6. Setelah mengubah `.env`, mulai ulang server Expo agar variabel konfigurasi dimuat.

Google OAuth memerlukan konfigurasi OAuth Client ID untuk platform yang digunakan. Aplikasi menggunakan skema `layoutsimple` yang sudah didefinisikan di `app.json`. OAuth redirect perlu diuji dengan development build; Expo Go tidak mendukung konfigurasi redirect OAuth khusus aplikasi.

## Menjalankan aplikasi

```bash
npm install
npx expo run:android
```

Perintah tersebut membuat dan menjalankan development build Android. Untuk menjalankan server setelah build tersedia, gunakan `npx expo start --dev-client`. Di macOS, gunakan `npx expo run:ios`; untuk web, gunakan `npx expo start --web`. Expo Go tidak dapat menyelesaikan OAuth redirect aplikasi ini.

Setiap data yang ditambahkan dari beranda disimpan ke Firestore dan akan muncul pada daftar realtime.

## Pemeriksaan

```bash
npx expo lint
npx tsc --noEmit
```
