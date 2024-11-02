// @ts-ignore
import { LitElement } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
import { MlVision, Client } from "../../lib/index.js";
import { shortGuid } from 'ixfx/random.js';

// Parse query params
const params = (new URL(document.location.toString())).searchParams;

// Use 'peerId' specified as URL parameter or a random one
const peerId = params.get(`peerId`) ?? shortGuid();

// Setup
const ds = new MlVision(`#is`, {
  // Mode to run: pose, hand, objects, face
  mode: `hand`,
  // How often to run computation on image
  computeFreqMs: 10,
  // Remote id
  remote: {
    peerId
  },
  // Default camera
  camera: {
    facingMode: `user`,
  },
  hand: {                                   //READ MediaPipe Documentation, you may need to modify some settings
    // See: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker#configurations_options
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    numHands: 2,                  //HERE YOU CAN CHANGE IT TO ONE HAND
    modelPath: `hand_landmarker.task`,
    verbosity: `errors`
  },
  // For troubleshooting, try 'info' or 'debug'
  verbosity: `errors`,
  wasmBase: `/ml/lib`,
  modelsBase: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/`,
  hideModelSelector: true
});

ds.init();

// Eg dump out data
// const client = new Client();
// client.addEventListener(`message`, event => {
//   const { detail } = event;
//   console.log(detail);
// })
