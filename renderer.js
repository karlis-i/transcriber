
let playing = false; // ?

let btnPlayPause = null;

let audioFileInput = null;
let audioFileBtn = null;
let audioFileLbl = null;
let audioElement = null;
let audioFile = null;
let audioLoaded = false;
let isStereo = false;

let channelSelectorL = null;
let channelSelectorS = null;
let channelSelectorR = null;

const playString = "&#x25B6;";
const pauseString = "&#x23F8;";

const audioContext = new AudioContext();
let track = null;
const gainNode = audioContext.createGain();


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
    audioFileInput.addEventListener('change', async function(){

        // @todo: loading another file crashes app

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
        track = audioContext.createMediaElementSource(audioElement);

        // connect node to output
        track.connect(gainNode).connect(audioContext.destination);

        // set loaded flag
        audioLoaded = true;

        // check if stereo
        // why buffers?
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channels = audioBuffer.numberOfChannels;
        isStereo = channels === 2;

        if (isStereo) {
            channelSelectorL.disabled = false;
            channelSelectorS.disabled = false;
            channelSelectorR.disabled = false;
        } else {
            channelSelectorL.disabled = true;
            channelSelectorS.disabled = true;
            channelSelectorR.disabled = true;
        }
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


// Volume
let volume = 100;
let volumeInput = null;
let volumeOutput = null;

function setupVolume() {
    // assign DOM elements
    volumeInput = document.getElementById('rangeVolume');
    volumeOutput = document.getElementById('outputVolume');

    // display init value
    volumeOutput.textContent = volumeInput.value + "%";

    // start listening
    volumeInput.addEventListener('input', function () {
        volume = this.value;
        volumeOutput.textContent = volume + "%";
        gainNode.gain.value = volume / 100;
    });
}

function setupChannelSelector() {

    channelSelectorL.addEventListener("change", function(){
        console.log("left channel selected");

        track.disconnect();
        gainNode.disconnect();
        audioContext.destination.disconnect();
        // Split the stereo signal into separate L and R channels
        const splitter = audioContext.createChannelSplitter(2);

        // Merge back into stereo, but using left channel for both outputs
        const merger = audioContext.createChannelMerger(2);

        // Wire it up
        track.connect(gainNode).connect(splitter);

        splitter.connect(merger, 0, 0); // left  → left
        splitter.connect(merger, 0, 1); // left  → right (ignore right channel)

        merger.connect(audioContext.destination);
    });
    channelSelectorS.addEventListener("change", function(){
        console.log("stereo channel selected");
        track.disconnect();
        gainNode.disconnect();
        audioContext.destination.disconnect();
        track.connect(gainNode).connect(audioContext.destination);
    });
    channelSelectorR.addEventListener("change", function(){
        console.log("right channel selected");
        track.disconnect();
        gainNode.disconnect();
        audioContext.destination.disconnect();
        // Split the stereo signal into separate L and R channels
        const splitter = audioContext.createChannelSplitter(2);

        // Merge back into stereo, but using left channel for both outputs
        const merger = audioContext.createChannelMerger(2);

        // Wire it up
        track.connect(gainNode).connect(splitter);

        splitter.connect(merger, 1, 0); // right  → left
        splitter.connect(merger, 1, 1); // right  → right (ignore left channel)

        merger.connect(audioContext.destination);
    });

}


document.addEventListener("DOMContentLoaded", function () {

    // fetch elements that are used in multiple functions
    btnPlayPause = document.getElementById("btnPlayPause");
    audioElement = document.getElementById('audioElement');

    channelSelectorL = document.getElementById("radioChannelL");
    channelSelectorS = document.getElementById("radioChannelS");
    channelSelectorR = document.getElementById("radioChannelR");

    // setup functions
    setupAudioElements();
    setupTransport();
    setupSpacebarControl();
    setupVolume();
    setupChannelSelector();
});
