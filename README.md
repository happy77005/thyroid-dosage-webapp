# ThyroidAI - Intelligent Thyroid Report Analyzer & Dosage Predictor
> **Academic Minor Project | Educational Purpose Only**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Educational](https://img.shields.io/badge/Status-Research_Prototype-blue)](https://github.com/)
[![Stack](https://img.shields.io/badge/Tech-React_Typescript_Firebase-cyan)](https://react.dev/)

---

## ⚠️ Medical Disclaimer
> **IMPORTANT: THIS APPLICATION IS FOR EDUCATIONAL AND RESEARCH PURPOSES ONLY.**
>
> This software implements dosage caluculation algorithms based on medical research papers and clinical guidelines. However, **it is NOT a certified medical device**.
> *   Do NOT use this for actual medical diagnosis or treatment.
> *   Always consult a qualified endocrinologist or healthcare provider.
> *   The creators assume no liability for the use or misuse of this software.

---

## 📖 Project Overview
**ThyroidAI** is a comprehensive full-stack web application designed to automate the extraction of thyroid function test (TFT) data from PDF medical reports and provide evidence-based dosage recommendations.

Developed as a **College Minor Project**, this system aims to bridge the gap between raw medical data and actionable insights using OCR, Regular Expressions, and algorithmic clinical logic.

### 🔬 Research Basis
The dosage algorithms implemented in this project are based on standard clinical guidelines for:
*   **Hypothyroidism**: Weight and age-based Levothyroxine dosage calculation.
*   **Hyperthyroidism**: Methimazole starting dose estimation based on Free T4/T3 levels.
*   **Subclinical Conditions**: TSH-dependent observation vs. treatment protocols.

## 🚀 Key Features

### 1. Unified Medical Report Parsing
*   **Universal PDF Parsing**: Uses `PDF.js` and custom Regulation Expressions (Regex) to extract data from various lab report formats.
*   **Intelligent Extraction**: Automatically identifies Patient Name, Date, TSH, T3, T4, FT3, and FT4 values.
*   **Reference Range Detection**: Auto-detects normal ranges from the report or falls back to standard medical constants.

### 2. Clinical Dosage Prediction
*   **Algorithmic Analysis**: Classifies thyroid status (Euthyroid, Hypo, Hyper) based on extracted values.
*   **Personalized Recommendations**: Takes patient age, weight, and gender into account for precise dosage adjustments.
*   **Severity Grading**: Categorizes condition severity (Mild/Overt/Subclinical).

### 3. Patient Health Dashboard
*   **Trend Visualization**: Interactive **Google Charts** integration to track TSH levels over time.
*   **Visual Zones**: Color-coded graphs showing "Normal", "Hypo", and "Hyper" risk zones.
*   **Historical Data**: Firebase-backed storage of all past reports for longitudinal analysis.

### 4. Enterprise-Grade Architecture
*   **Secure Authentication**: Firebase Auth (Google & Email/Password) with email verification.
*   **Cloud Storage**: Encrypted patient data storage using Cloud Firestore.
*   **Privacy-First**: "Delete Account" functionality ensures users have full control over their data (GDPR/HIPAA compliance demonstration).

## 🛠️ Technology Stack

| Component | Technology |
|:---|:---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS (Glassmorphism design) |
| **Backend / DB** | Firebase (Auth + Firestore) |
| **PDF Processing** | PDF.js, Helper Regex Utilities |
| **Visualization** | Google Charts API |
| **Icons** | Lucide React |

## ⚙️ Installation & Setup

This project requires **Node.js 16+** and a **Firebase Project**.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/happy77005/thyroid-dosage-webapp
    cd thyroid-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Firebase**
    *   Create a project at [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Authentication** (Google & Email/Password).
    *   Enable **Firestore Database**.
    *   Create a `.env` file in the root directory:
        ```env
        VITE_FIREBASE_API_KEY=your_api_key
        VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
        VITE_FIREBASE_PROJECT_ID=your_project_id
        VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
        VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
        VITE_FIREBASE_APP_ID=your_app_id
        ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📂 Project Structure
```bash
src/
├── components/         # UI Components (Dashboard, Upload, Charts)
├── utils/
│   ├── analyzers/      # Medical logic & status classification
│   ├── extractors/     # Regex logic for PDF parsing
│   ├── googleChartsLoader.ts # Lazy loading for charts
│   └── thyroidDosagePredictor.ts # Core dosage algorithms
├── firebase/           # Firebase config & services
└── types/              # TypeScript definitions
```

## 🤝 Contribution
This is an open-source educational project. Contributions to improve regex accuracy for different lab report formats are welcome!

1.  Fork the repo
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created by [Your Name] - [College Name]*
