const video = document.getElementById('video');
video.style.position = 'absolute';
video.style.top = '0';
video.style.left = '0';
video.style.width = '100%';
video.style.height = '100%';
video.style.objectFit = 'cover';
video.style.opacity = '0'; // hide the video feed

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('weights/'),
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
      };
    })
    .catch(err => console.error("Error accessing media devices:", err));
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: window.innerWidth, height: window.innerHeight };
  faceapi.matchDimensions(canvas, displaySize);

  let lastKnownFace = null;
  let smoothedLeftEye = { x: 0, y: 0 };
  let smoothedRightEye = { x: 0, y: 0 };
  const smoothingFactor = 0.4;

  const xScale = displaySize.width / video.videoWidth;
  const yScale = displaySize.height / video.videoHeight;

  async function detectFaces() {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const firstFace = detections[0].box;

      const adjustedX = firstFace.x * xScale;
      const adjustedY = firstFace.y * yScale;
      const adjustedWidth = firstFace.width * xScale;
      const adjustedHeight = firstFace.height * yScale;

      const faceCenterX = adjustedX + adjustedWidth / 2;
      const faceCenterY = adjustedY + adjustedHeight / 2;

      lastKnownFace = { x: adjustedX, y: adjustedY, width: adjustedWidth, height: adjustedHeight, centerX: faceCenterX, centerY: faceCenterY };

      const rawLeftCircleX = displaySize.width - (lastKnownFace.x - 20);
      const rawLeftCircleY = lastKnownFace.centerY - 100;
      const rawRightCircleX = displaySize.width - (lastKnownFace.x + lastKnownFace.width + 20);
      const rawRightCircleY = lastKnownFace.centerY - 100;

      smoothedLeftEye.x = smoothedLeftEye.x * (1 - smoothingFactor) + rawLeftCircleX * smoothingFactor;
      smoothedLeftEye.y = smoothedLeftEye.y * (1 - smoothingFactor) + rawLeftCircleY * smoothingFactor;

      smoothedRightEye.x = smoothedRightEye.x * (1 - smoothingFactor) + rawRightCircleX * smoothingFactor;
      smoothedRightEye.y = smoothedRightEye.y * (1 - smoothingFactor) + rawRightCircleY * smoothingFactor;

      drawCircle(smoothedLeftEye.x, smoothedLeftEye.y);
      drawCircle(smoothedRightEye.x, smoothedRightEye.y);
    } else if (lastKnownFace) {
      drawCircle(smoothedLeftEye.x, smoothedLeftEye.y);
      drawCircle(smoothedRightEye.x, smoothedRightEye.y);
    }

    requestAnimationFrame(detectFaces);
  }

  detectFaces();
});

function drawCircle(x, y) {
  const ctx = document.querySelector('canvas').getContext('2d');
  ctx.beginPath();
  ctx.arc(x, y, 50, 0, 2 * Math.PI);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'cyan';
  ctx.stroke();
  ctx.closePath();
}
