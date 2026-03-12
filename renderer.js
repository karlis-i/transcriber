
let playing = false; // ?

let btnPlayPause = null;

let audioFileInput = null;
let audioFileBtn = null;
let audioFileLbl = null;
let audioElement = null;
let audioFile = null;
let audioLoaded = false;

const playString = "&#x25B6;";
const pauseString = "&#x23F8;";

const audioContext = new AudioContext();



function setupAudioElements() {

    audioFileInput = document.getElementById('audioFileInput');
    audioFileBtn = document.getElementById('audioFileBtn');
    audioFileLbl = document.getElementById('audioFileLbl');

    // use button instead of file input
    audioFileBtn.addEventListener('click', function(e){
        if (audioFileInput) {
            audioFileInput.click();
        }
    });

    // when audio file selected
    audioFileInput.addEventListener('change', function(){

        // get file
        audioFile = audioFileInput.files[0];

        // display filename
        audioFileLbl.value = audioFile.name;

        // load file in audio element
        audioElement.src = URL.createObjectURL(audioFile);
        audioElement.controls = false; // ?

        // remove focus from file input
        audioFileInput.blur();

        // context!

        // pass the audio element into the audio context
        const track = audioContext.createMediaElementSource(audioElement);

        // connect node to output
        track.connect(audioContext.destination);

        // set loaded flag
        audioLoaded = true;
    });

    audioElement.addEventListener("ended", function(){
        playPausePaused();
    });
}


function setupTransport() {

    // play/pause
    btnPlayPause.addEventListener("click", function (){

        // only active when audio file loaded
        if (!audioLoaded) {
            return false;
        }

        // webaudio context
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        // Play or pause track depending on state
        if (playing) {
            audioElement.pause();
            playPausePaused();
        } else {
            audioElement.play();
            playPausePlaying();
        }

    });
}

function playPausePlaying() {
    playing = true;
    btnPlayPause.innerHTML = pauseString;
    btnPlayPause.classList.remove("btn-outline-primary");
    btnPlayPause.classList.add("btn-success");
}

function playPausePaused() {
    playing = false;
    btnPlayPause.innerHTML = playString;
    btnPlayPause.classList.remove("btn-success");
    btnPlayPause.classList.add("btn-outline-primary");
}

function setupSpacebarControl() {
    // spacebar controls playback
    document.addEventListener("keydown", function(e){
        if (e.code === "Space") {
            e.preventDefault();
            btnPlayPause.click();
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {

    // fetch elements that are used in multiple functions
    btnPlayPause = document.getElementById("btnPlayPause");
    audioElement = document.getElementById('audioElement');

    // setup functions
    setupAudioElements();
    setupTransport();
    setupSpacebarControl();
});
