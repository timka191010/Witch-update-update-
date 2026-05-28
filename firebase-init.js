// Загружаем Firebase v10 modular SDK и выкладываем нужные функции на window,
// чтобы их можно было использовать в data.js без сборщика.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.firebaseApp = { initializeApp };
window.firebaseFirestore = {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs
};

// Сигнализируем, что SDK загружен — data.js дождётся этого
window.dispatchEvent(new Event('firebase-ready'));
