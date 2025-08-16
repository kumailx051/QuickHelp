import * as faceapi from "face-api.js";

export const loadModels = async () => {
  await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
};

export const compareFaces = async (image1, image2) => {
  const img1 = await faceapi.bufferToImage(image1);
  const img2 = await faceapi.bufferToImage(image2);

  const descriptor1 = await faceapi.computeFaceDescriptor(img1);
  const descriptor2 = await faceapi.computeFaceDescriptor(img2);

  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return distance < 0.6; // Adjust threshold as needed
};
