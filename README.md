# React Native Project with Expo

## Overview

This is a React Native project built with **Expo**. It demonstrates image processing and text recognition features.


## Requirements



## Getting Started

npm install
# QuickHelp

QuickHelp is a React Native application designed to connect clients with workers for various services. The app features user authentication, job posting, order management, chat, and profile management for both clients and workers. It also includes an admin panel for managing users and jobs.

## Features

- User authentication (sign up, login, role selection)
- Client and worker profiles
- Job posting and management
- Order management and tracking
- Real-time chat between clients and workers
- Admin dashboard for user and job management
- CNIC and profile upload with verification
- Localization support
- Face recognition and OCR utilities

## Project Structure

```
app/                # Main app screens and navigation
assets/             # Images, fonts, and other static assets
backend/            # Backend scripts and data (for local/server use)
constants/          # App-wide constants (e.g., colors)
src/components/     # Reusable UI components
src/hooks/          # Custom React hooks
src/localization/   # Localization files
src/store/          # Redux store and slices
src/styles/         # Global styles
src/utils/          # Utility functions (face recognition, OCR, etc.)
```

## Getting Started

### Prerequisites
- Node.js (v14 or above)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation
1. Clone the repository:
	```sh
	git clone https://github.com/kumailx051/QuickHelp.git
	cd QuickHelp
	```
2. Install dependencies:
	```sh
	npm install
	# or
	yarn install
	```
3. Start the Expo development server:
	```sh
	expo start
	```

### Running on Device/Emulator
- Use the Expo Go app on your mobile device or an emulator to scan the QR code and run the app.

## Backend
- The `backend/` folder contains scripts for OCR and server logic. You may need to set up a Node.js environment to run these scripts.

## Firebase
- The app uses Firebase for authentication and data storage. Update `firebaseConfig.js` with your Firebase project credentials.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License.
### 3. Start the Development Server
npx expo start

Scan the QR code from the terminal or the Expo Dev Tools in your browser using the Expo Go app.
The app will open on your mobile device.
