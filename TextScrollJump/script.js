// @ts-ignore
import { Remote } from "https://unpkg.com/@clinth/remote@latest/dist/index.mjs";
import * as Dom from 'ixfx/dom.js';
import * as MpVision from '../../lib/client/index.js';
import * as Hands from '../hands.js';
import { Geometry, Modulation, Numbers, Trackers } from 'ixfx/bundle.js';
import { Points, radianToDegree } from 'ixfx/geometry.js';
import { scale, Bipolar } from "ixfx/numbers.js";
import { Envelopes, } from 'ixfx/modulation.js';
import { intersection } from "ixfx/arrays.js";
import { relative } from "ixfx/flow.js";




const settings = Object.freeze({
  updateRateMs: 10, // How quickly to call update()
  remote: new Remote(),
  dataDisplay: new Dom.DataDisplay({ numbers: { leftPadding: 5, precision: 2 } }),
  thingEl: /** @type HTMLElement */(document.querySelector(`#thing`)),
  div1: document.getElementById(`div1`),
  div2: document.getElementById(`div2`),
  div3: document.getElementById(`div3`),
  div4: document.getElementById(`div4`),
  divFree: document.getElementById(`divFree`),
  holder: document.getElementById(`holder`),
  holderOfAll: document.getElementById(`holderOfAll`),
  divText: document.getElementById(`divText`),


  // Scales 'fist' value
  fistScaler: Numbers.scaler(0.18, 0.38, 0, 1, undefined, true),


  multiplier: 100,
});


/**
* @typedef {Readonly<{
*  thumbTip: Object
*  thumbKnuckle: Object
*  thumbExtention: Number
*  middleExtention: Number
*  ringExtention: Number
*  pinkyExtention: Number
*  indexTip: Object
*  indexKnuckle: Object
*  indexExtention: Number
*  indexAngle: Number
*  knuckleNorm: Object
*  openHandRotate: number
*  conditionMet: boolean
*  thumbCurl: number
*  indexInterpolated: number
*  middleInterpolated: number
*  ringInterpolated: number
*  indexThumb: number
*  dynamicPinchRaw: number
* }>} State
*/

/** @type State */
let state = {
  thumbTip: {},
  thumbKnuckle: {},
  thumbExtention: 0,
  indexTip: {},
  indexKnuckle: {},
  indexExtention: 0,
  middleExtention: 0,
  ringExtention: 0,
  pinkyExtention: 0,
  indexAngle: 0,
  knuckleNorm: {},
  conditionMet: false,
  openHandRotate: 0,
  thumbCurl: 0,
  indexInterpolated: 0,
  middleInterpolated: 0,
  ringInterpolated: 0,
  indexThumb: 0,
  dynamicPinchRaw: 0,

};

let conditionMet = false;
let dynamicDiv = null;

let currentColour = 0;
let currentColourIncrement = 20;

let rightPinch = false;
let indexCurl = false;
let middleCurl = false;
let ringCurl = false;

let leftAngle;

let rightFist = false;

let mainNumber = 0;

let div1Colour = 0;
let div1Number = 0;
let div2Colour = 0;
let div2Number = 0;

let div3Colour = 0;
let div3Number = 0;

let lastMiddle = 0;

let currentIncrement = 0;

let numberIncrementer = 2;        //The number change speed
let currentNumberIncrementer = 0;
let currentNumber = 0;
let binaryPinch = 0;
let scroll = 0;


const env = new Envelopes.Adsr({
  attackDuration: 1000,
  sustainLevel: 1,
  decayDuration: 2000,
});



function createNew() {
  dynamicDiv = document.createElement("div");
  dynamicDiv.id = "dynamicDiv";
  document.body.appendChild(dynamicDiv);
}

function adjustDimensions(width, height) {
  if (dynamicDiv) {
    dynamicDiv.style.width = width + 'px';
    dynamicDiv.style.height = height + 'px';
  }
}

function checkCondition(indexExtention, thumbExtention) {
  if (!conditionMet && indexExtention > 0.7 && state.thumbCurl > 0.65) {
    createNew();
    conditionMet = true;
  }

  if (conditionMet && (indexExtention > 0.7 && state.thumbCurl > 0.65)) {
    // Adjust the div's dimensions in real time
    let newWidth = state.indexAngle;  // Scale width based on indexExtention
    let newHeight = state.indexAngle;  // Scale height based on thumbExtention
    adjustDimensions(newWidth, newHeight);
    document.body.style.backgroundColor = `white`;
  }

  if (conditionMet && !(indexExtention > 0.7 && state.thumbCurl > 0.65)) {
    // Condition is no longer met
    conditionMet = false;
    document.body.style.backgroundColor = `beige`;

  }
}


/**
* Runs periodically, computing something
* new from latest pose data
*/
const update = () => {
  // Debug display, eg: 
  // settings.dataDisplay.update({ field1, field2 );
  // if (rightPinch) {
  //   currentColour += settings.currentColourIncrement
  // }
  const { indexExtention, middleExtention, ringExtention } = state;

  let { indexInterpolated, middleInterpolated, ringInterpolated, } = state;
  indexInterpolated = Numbers.interpolate(0.1)(indexInterpolated, indexExtention);
  middleInterpolated = Numbers.interpolate(0.1)(middleInterpolated, middleExtention);
  ringInterpolated = Numbers.interpolate(0.1)(ringInterpolated, ringExtention);

  saveState({ indexInterpolated, middleInterpolated, ringInterpolated })

};

/**
* Uses state
*/

function calculateAngle(tip, knuckle) {
  let dx = tip.x - knuckle.x;
  let dy = tip.y - knuckle.y;

  // Get the angle in radians
  let angleInRadians = Math.atan2(dy, dx);

  // Convert the angle to degrees
  let angleInDegrees = angleInRadians * (180 / Math.PI);
  return angleInDegrees;
}

const fingerExtension = (fingerName, landmarks) => {
  const tip = Hands.getFingertip(fingerName, landmarks);
  const knuckle = Hands.getKnuckle(fingerName, landmarks);
  return Points.distance(tip, knuckle);
};

const fist = (landmarks) => {
  const { fistScaler } = settings;

  const fingerNames = Hands.getFingerNames();

  // Calculate extension for each finger
  const extensions = fingerNames.map(name => fingerExtension(name, landmarks));

  // Add up all the numbers
  const sum = Numbers.total(extensions);

  // Scale and invert number
  return Numbers.flip(fistScaler(sum));
};



function use() {
  // Do something...
  const { thumbTip, thumbExtention, thumbKnuckle, indexTip, indexKnuckle, knuckleNorm, indexExtention, ringExtention,
    middleExtention, pinkyExtention, conditionMet, thumbCurl, indexInterpolated, middleInterpolated, ringInterpolated,
    indexThumb, dynamicPinchRaw } = state;
  const { div1, div2, div3, div4, holder, holderOfAll, divFree, divText } = settings;

  // let xCoordinates1 = ((1 - thumbX1) * window.innerWidth);
  // let yCoordinates1 = ((thumbY1) * window.innerHeight);
  // let zCoordinates1 = Math.abs(thumbZ1);

  let xCoordinates1 = ((1 - thumbTip.x) * window.innerWidth);
  let yCoordinates1 = ((thumbTip.y) * window.innerHeight);

  // let zCoordinates1 = Math.abs(thumbZ1);
  // let zCoordinates1Scaled = Numbers.scale(zCoordinates1, 0.01, 0.35, 50, 1000);

  // let angle2 = radianToDegree(Points.angleRadian(indexTip, indexKnuckle));
  // let angle3 = Points.angleRadian(tip, knuckle)
  // let angleScaled = Numbers.scaleClamped(angle, 90, 179, 100, 500)

  checkCondition(indexExtention, thumbExtention);

  let rotation = 0
  // hand1?.style.rotate = `${rotation}deg`



  // if (div1) {
  //   // div1.style.backgroundColor = `hsl(0, 0%, ${indexExtention}%)`;
  //   // div1.style.transform = `translate(${indexExtention * 3}px, 50px)`;

  //   if (indexExtention < 70) {
  //     env.trigger();
  //   } else {
  //     env.release();
  //   }
  //   div1.style.backgroundColor = `hsl(0, 0%, ${env.value * 100}%)`;
  // }

  // if (holderOfAll) {
  //   holderOfAll.style.rotate = `${270 - leftAngle}deg`;

  // }

  // if (divFree) {
  //   divFree.style.transform = `translate(-200px, -600px)`;
  //   divFree.style.height = `${currentNumberIncrementer * 200}px`
  // }

  // if (divText) {
  //   scroll += (binaryPinch * 3)
  //   let scrolling = binaryPinch * 10
  //   console.log(scrolling)
  //   window.scrollBy({ top: scrolling, left: 0, behavior: "smooth" });

  // }


  // if (div1) {
  //   div1.style.transform = `translate(0px, ${1 - (2.5 * ringInterpolated)}px)`;

  //   if (ringExtention < 70 && !ringCurl && !rightFist) {
  //     div1Colour = currentColour
  //     div1.style.backgroundColor = `hsl(${div1Colour}, 50%, 50%)`;
  //     div1Number = Math.round(currentNumber)
  //     div1.innerText = `${div1Number}`

  //     ringCurl = true;
  //   };
  //   if (ringExtention > 70 && ringCurl) {
  //     ringCurl = false;
  //   };
  // }

  // if (div2) {
  //   div2.style.transform = `translate(0px, ${- (2.5 * middleInterpolated)}px)`;
  //   if (middleExtention < 70 && !middleCurl && !rightFist) {
  //     div2Colour = currentColour
  //     div2.style.backgroundColor = `hsl(${div2Colour}, 50%, 50%)`;
  //     // div3.style.transform = `translate(${ringExtention * 3}px, 250px)`;
  //     div2Number = Math.round(currentNumber)
  //     div2.innerText = `${div2Number}`
  //     middleCurl = true;
  //   };
  //   if (middleExtention > 70 && middleCurl) {
  //     middleCurl = false;
  //   };
  //   if (middleExtention > 70 && rightFist) {
  //     currentColour = div2Colour;
  //   };

  // }
  // if (div3) {
  //   div3.style.transform = `translate(0px, ${1 - (2.5 * indexInterpolated)}px)`;
  //   if (indexExtention < 70 && !indexCurl && !rightFist) {
  //     div3Colour = currentColour
  //     div3.style.backgroundColor = `hsl(${div3Colour}, 50%, 50%)`;
  //     // div3.style.transform = `translate(${ringExtention * 3}px, 250px)`;
  //     div3Number = Math.round(currentNumber)
  //     div3.innerText = `${div3Number}`
  //     indexCurl = true;
  //   };
  //   if (indexExtention > 70 && indexCurl) {
  //     indexCurl = false;
  //   };
  // }

  // if (div4) {

  //   div4.style.backgroundColor = `hsl(${currentColour}, 50%, 50%)`;
  //   // div4.style.filter = `blur(${currentIncrement * 4}px)`;
  //   div4.innerText = `${Math.round(currentNumber)}`


  //   // div4.style.transform = `translate(${pinkyExtention * 3}px, 350px)`;
  //   if (indexExtention > 60 && rightFist) {
  //     currentColour = div3Colour;
  //     currentNumber = div3Number;
  //     div4.style.backgroundColor = `hsl(${currentColour}, 50%, 50%)`;
  //   };
  //   if (middleExtention > 60 && rightFist) {
  //     currentColour = div2Colour;
  //     currentNumber = div2Number;
  //     div4.style.backgroundColor = `hsl(${currentColour}, 50%, 50%)`;
  //   };
  //   if (ringExtention > 60 && rightFist) {
  //     currentColour = div1Colour;
  //     currentNumber = div1Number;

  //     div4.style.backgroundColor = `hsl(${currentColour}, 50%, 50%)`;
  //   };
  //   if (rightPinch) {
  //     div4.style.border = '2px solid #000';
  //   } else {
  //     div4.style.border = '0px solid #000';

  //   }
  // }

  //---------------------------------------

  //NEW SCROLLING




  if (!conditionMet && (indexExtention > 0.7) && (thumbCurl > 0.65)) {
    createNew();
    saveState({ conditionMet: true });  // Set the flag to true, so it doesn't run again
  }



  // console.log(wrist.x)

}



/**
* Called with data from MediaPipe
* @param {MpVision.HandLandmarkerResult} hands 
*/
const updateFromHands = (hands) => {
  if (!hands || hands.landmarks.length === 0) {
    // No data... do something special?
    return;
  }

  // const hand1 = Hands.getHand(0, hands);

  const left = Hands.findByHandedness(`left`, hands);
  const right = Hands.findByHandedness(`right`, hands);







  if (left) {
    const thumbTip = Hands.getFingertip('thumb', left.worldLandmarks);
    const thumbKnuckle = Hands.getKnuckle(`thumb`, left.worldLandmarks);

    const indexTip = Hands.getFingertip('index', left.worldLandmarks);
    const indexKnuckle = Hands.getKnuckle(`index`, left.worldLandmarks);

    let indexExtentionRaw = fingerExtension(`index`, left.worldLandmarks) * settings.multiplier;
    let indexExtention = Numbers.scaleClamped(indexExtentionRaw, 5, 7, 0, 100);
    let indexThumb = Points.distance(thumbTip, indexTip);

    let middleExtentionRaw = fingerExtension(`middle`, left.worldLandmarks) * settings.multiplier;
    let middleExtention = Numbers.scaleClamped(middleExtentionRaw, 6, 9, 0, 100);

    let ringExtentionRaw = fingerExtension(`ring`, left.worldLandmarks) * settings.multiplier;
    let ringExtention = Numbers.scaleClamped(ringExtentionRaw, 6.2, 8, 0, 100);

    let pinkyExtentionRaw = fingerExtension(`pinky`, left.worldLandmarks) * settings.multiplier;
    let pinkyExtention = Numbers.scaleClamped(pinkyExtentionRaw, 5, 6.8, 0, 100);

    // console.log("index: " + indexExtentionRaw + " " + "middle: " + middleExtentionRaw + " " + "ring: " + ringExtentionRaw + " " + "pinky: " + pinkyExtentionRaw);
    // console.log("index: " + pinkyExtentionRaw)

    // let thumbExtentionRaw = fingerExtension(`thumb`, left.worldLandmarks);
    // let thumbExtention = Numbers.scale(thumbExtentionRaw, 0.035, 0.06, 0, 1);

    let thumbExtentionFlipped = Numbers.flip(Points.distance(thumbTip, indexKnuckle));
    let thumbExtention = Points.distance(thumbTip, indexKnuckle);



    //Calculates the angle of the hand
    let base = left.worldLandmarks[0];
    let tip = left.worldLandmarks[5];

    leftAngle = calculateAngle(base, tip);


    let reference = Points.distance(base, tip)
    let thumbCurl = thumbExtention / reference
    // console.log(reference)



    let angle = calculateAngle(indexTip, indexKnuckle);
    let scaledAngle = Numbers.scale(angle, 90, 178, 100, 500);

    //  JUMP SCROLLING

    let leftIndex = left.worldLandmarks[8];
    let leftThumb = left.worldLandmarks[4];
    let leftThumbKnuckle = left.worldLandmarks[2];
    let thumbLength = Points.distance(leftThumb, leftThumbKnuckle) * settings.multiplier;

    let dynamicPinchRaw = Points.distance(leftIndex, leftThumbKnuckle) * settings.multiplier;
    let relativeSlide = dynamicPinchRaw / thumbLength
    let relativeSlideClamped = Numbers.flip(Numbers.scaleClamped(relativeSlide, 0.3, 0.8)) * 10;
    const percentage = 10 * Math.abs(relativeSlideClamped); // Percentage you want to scroll to
    // const scrollage = ((Math.round(percentage)) / 10)

    let position = 0;

    if (percentage < 20) {
      position = 0;
    } else if (percentage < 75) {
      position = (document.documentElement.scrollHeight - window.innerHeight) * 0.5;
    } else {
      position = (document.documentElement.scrollHeight - window.innerHeight);
    }

    // console.log(relativeSlide)  
    // console.log(percentage);



    window.scrollTo({
      top: position,
      behavior: "smooth"
    });



    // let indexExtention2 = Numbers.scale(Points.distance(indexTip, indexKnuckle), 0.05, 0.075)
    // let pinkyExtention = fingerExtension(`pinky`, left.worldLandmarks);
    // let index2 = Points.distance(indexTip, indexKnuckle)


    saveState({
      indexExtention: indexExtention,
      middleExtention: middleExtention,
      ringExtention: ringExtention,
      pinkyExtention: pinkyExtention,
      indexThumb: indexThumb,
    });


    // saveState({ thumbTip: thumbTip, thumbExtention: thumbExtention, indexTip: indexTip, indexKnuckle: indexKnuckle, indexExtention: indexExtention, indexAngle: scaledAngle, thumbCurl: thumbCurl });

  }

  if (right) {

    //Fingers
    const rightIndex = Hands.getFingertip('index', right.worldLandmarks);
    const rightThumb = Hands.getFingertip('thumb', right.worldLandmarks);
    const rightThumbKnuckle = Hands.getKnuckle(`thumb`, right.worldLandmarks);
    const rightThumb2 = right.worldLandmarks[2];

    let middleThumbValue = Points.distance(rightThumb2, rightIndex) * settings.multiplier;



    //Calculating them
    let pinch = Points.distance(rightThumb, rightIndex) * settings.multiplier;
    let thumbLength = Points.distance(rightThumb, rightThumbKnuckle) * settings.multiplier;


    let dynamicPinchRaw = Points.distance(rightIndex, rightThumbKnuckle) * settings.multiplier;
    let relativeSlide = dynamicPinchRaw / thumbLength
    let relativeSlideClamped = Numbers.flip(Numbers.scaleClamped(relativeSlide, 0.6, 0.9)) * 10;
    // let flipped = Numbers.flip(dynamicPinchRaw / thumbLength)
    // let scaledSlider = Numbers.scaleClamped(flipped, 0.17, 0.44, 0, 1)
    let dynamicPinchClamped = Numbers.flip(Numbers.scaleClamped(dynamicPinchRaw, 2, 6, 0, 1));
    binaryPinch = Bipolar.scale(dynamicPinchRaw, 4.3, 8.2);
    saveState({ dynamicPinchRaw: dynamicPinchRaw })


    if (middleThumbValue < 10) {
      //  SCROLLING
      if (document.getElementById(`divText`)) {
        scroll += (binaryPinch * 3)

        let scrollEase = Modulation.Easings.Named.cubicIn(binaryPinch)
        let scrolling = scrollEase * 3000
        console.log(scrollEase)

        window.scrollBy({ top: scrolling, left: 0, behavior: "smooth" });

        // //  JUMP SCROLLING
        // const percentage = 10 * Math.abs(relativeSlideClamped); // Percentage you want to scroll to
        // // const scrollage = ((Math.round(percentage)) / 10)

        // let position = 0;

        // if (percentage < 10) {
        //   position = 0;
        // } else if (percentage < 90) {
        //   position = (document.documentElement.scrollHeight - window.innerHeight) * 0.5;
        // } else {
        //   position = (document.documentElement.scrollHeight - window.innerHeight);
        // }

        // console.log(percentage);


        // window.scrollTo({
        //   top: position,
        //   behavior: "smooth"
        // });
      }
    }

  }


};


/**
* Setup and run main loop 
*/
function setup() {
  const { updateRateMs, remote } = settings;

  remote.onData = onReceivedPoses;

  // Update at updateRateMs
  const updateLoop = () => {
    update();
    use();
    setTimeout(updateLoop, updateRateMs);
  };
  updateLoop();

  window.addEventListener('keydown', (event) => {
    if (event.keyCode === 39) {
      currentColour += currentColourIncrement
      console.log(currentColour);
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.keyCode === 37) {
      currentColour -= currentColourIncrement
      console.log(currentColour);
    }
  });

};
setup();


/**
* Called when we have pose data via Remote.
* Hand data is saved to state.
* @param {*} packet 
*/
function onReceivedPoses(packet) {
  const { data } = packet;
  const handsData = /** @type MpVision.HandLandmarkerResult */(JSON.parse(data));

  if (Array.isArray(handsData)) {
    console.warn(`Unexpectedly getting an array of data. Is the sender set to 'face'?`);
    return;
  }

  if (!(`handedness` in handsData)) {
    console.warn(`Did not find 'handedness' property as expected. Is the sender set to 'hand'?`);
    return;
  }
  updateFromHands(handsData);
};

/**
* Update state
* @param {Partial<State>} s 
*/
function saveState(s) {
  state = Object.freeze({
    ...state,
    ...s
  });
  return state;
}
