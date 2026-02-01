
// Volume
let volume = 100;
let volumeInput = null;
let volumeOutput = null;

// Speed
// Pitch

function setupRangeOutputs() {
    // Volume

    // assign DOM elements
    volumeInput = document.getElementById('rangeVolume');
    volumeOutput = document.getElementById('outputVolume');

    // display init value
    volumeOutput.textContent = volumeInput.value;

    // start listening
    volumeInput.addEventListener('input', function () {
        volume = this.value;
        volumeOutput.textContent = this.value;
        console.log("Volume", volume);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    setupRangeOutputs();
});
