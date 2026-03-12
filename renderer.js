
let playing = false; // ?

let btnPlayPause = null;

let audioFileInput = null;
let audioFileBtn = null;
let audioFileLbl = null;
let audioElement = null;
let audioFile = null;


function setupAudioElements() {

    audioFileInput = document.getElementById('audioFileInput');
    audioFileBtn = document.getElementById('audioFileBtn');
    audioFileLbl = document.getElementById('audioFileLbl');
    audioElement = document.getElementById('audioElement');

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

        // remove focus from file input
        audioFileInput.blur();
    });
}


function setupTransport() {
    btnPlayPause = document.getElementById("btnPlayPause");

    const playString = "&#x25B6;";
    const pauseString = "&#x23F8;";

    // play/pause
    btnPlayPause.addEventListener("click", function (){

        if (!audioFile) {
            return false;
        }

        if (playing) {
            //pause
            btnPlayPause.innerHTML = playString;
            btnPlayPause.classList.remove("btn-success");
            btnPlayPause.classList.add("btn-outline-primary");
        } else {
            btnPlayPause.innerHTML = pauseString;
            btnPlayPause.classList.remove("btn-outline-primary");
            btnPlayPause.classList.add("btn-success");
        }
        playing = !playing;

    });
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
    setupAudioElements();
    setupTransport();
    setupSpacebarControl();
});
