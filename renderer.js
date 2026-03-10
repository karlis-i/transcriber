
// Volume
let volume = 100;
let volumeInput = null;
let volumeOutput = null;

// Peaks.js waveform instance (global)
let peaksInstance = null;
let selectedSegment = null; // currently highlighted segment to loop


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
        volumeOutput.textContent = volume;
        audioElement.volume = volume / 100;
    });
}

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

    // when audio loaded
    audioFileInput.addEventListener('change', function(){

        // get file
        audioFile = audioFileInput.files[0];

        // display filename
        audioFileLbl.value = audioFile.name;

        // load file in audio element
        audioElement.src = URL.createObjectURL(audioFile);
        audioElement.controls = true;

        // clear any previous loop segment
        selectedSegment = null;

        drawWaveForm();

        // remove focus from file input
        audioFileInput.blur();
    });
}

let btnPlayPause = null;
let btnRewind = null;
let btnForward = null;
let playing = false;

function setupTransport() {
    btnPlayPause = document.getElementById("btnPlayPause");
    btnRewind = document.getElementById("btnRewind");
    btnForward = document.getElementById("btnForward");

    const playString = "&#x25B6;";
    const pauseString = "&#x23F8;";

    // play/pause
    btnPlayPause.addEventListener("click", function (){
        if (audioElement.currentSrc) {
            if (audioElement.paused) {
                // if we have a selected segment, play it with loop
                if (selectedSegment && peaksInstance) {
                    peaksInstance.player.playSegment(selectedSegment, true);
                } else {
                    audioElement.play();
                }
                btnPlayPause.innerHTML = pauseString;
                btnPlayPause.classList.remove("btn-outline-primary");
                btnPlayPause.classList.add("btn-success");
            } else {
                // pause whichever player is active
                if (selectedSegment && peaksInstance) {
                    peaksInstance.player.pause();
                } else {
                    audioElement.pause();
                }
                btnPlayPause.innerHTML = playString;
                btnPlayPause.classList.remove("btn-success");
                btnPlayPause.classList.add("btn-outline-primary");
            }
            playing = !playing;
        }
    });

    // rewind
    btnRewind.addEventListener("click", function(){
        if (selectedSegment && peaksInstance) {
            peaksInstance.player.pause();
            selectedSegment = null;
        }
        audioElement.currentTime = 0;
    });

    // forward
    btnForward.addEventListener("click", function(){
        if (selectedSegment && peaksInstance) {
            peaksInstance.player.pause();
            selectedSegment = null;
        }
        audioElement.currentTime += 5;
    });
}

function drawWaveForm() {
    const audioContext = new AudioContext();

    (function (Peaks) {
        const options = {
            zoomview: {
                container: document.getElementById('zoomview-container'),
                // highlight segments with overlay when user drags
                enableSegments: true,
                segmentOptions: {
                    markers: true,
                    overlay: true,
                    overlayColor: 'rgba(0, 123, 255, 0.3)' // blue-ish highlight
                }
            },
            overview: {
                container: document.getElementById('overview-container'),
                enableSegments: true,
                segmentOptions: {
                    markers: false,
                    overlay: true,
                    overlayColor: 'rgba(0, 123, 255, 0.2)'
                }
            },
            scrollbar: {
                container: document.getElementById('scrollbar-container'),
                color: '#888',
                minWidth: 100
            },
            showPlayheadTime: true,
            mediaElement: audioElement,
            webAudio: {
                audioContext: audioContext,
                scale: 128,
                multiChannel: true              // render separate left/right channels
            }
        };

        Peaks.init(options, function (err, peaks) {
            if (err) {
                console.error(`Failed to initialize Peaks instance: ${err.message}`);
                return;
            }

            peaksInstance = peaks; // keep global reference

            // populate zoom slider controls after instance ready
            setupZoomControl();

            // enable user selection dragging on the zoom view
            const view = peaks.views.getView('zoomview');
            if (view) {
                view.enableMarkerEditing(true);
                view.setWaveformDragMode('insert-segment');
                view.enableSegmentDragging(true);
            }

            // whenever the user inserts a segment (dragged region), remember it and remove previous selections
            peaks.on('segments.insert', function(event) {
                const segment = event.segment;
                // delete old segments (keep only the new one)
                const all = peaks.segments.getSegments();
                all.forEach(s => {
                    if (s.id !== segment.id) {
                        peaks.segments.removeById(s.id);
                    }
                });
                // store the segment but do NOT start playback yet
                selectedSegment = segment;
            });
        });
    })(peaks);
}

function setupZoomControl() {
    const zoomInput = document.getElementById('rangeZoom');
    const zoomOutput = document.getElementById('outputZoom');
    if (!zoomInput || !zoomOutput || !peaksInstance) return;

    const zoomLevels = peaksInstance.options.zoomLevels || [];
    if (zoomLevels.length === 0) return;

    // configure slider
    zoomInput.min = 0;
    zoomInput.max = zoomLevels.length - 1;
    zoomInput.step = 1;
    zoomInput.value = zoomLevels.length - 1; // default to full waveform

    function updateZoomDisplay(index) {
        const samplesPerPixel = zoomLevels[index];
        zoomOutput.textContent = `${samplesPerPixel} samp/px`;
    }
    updateZoomDisplay(zoomInput.value);

    zoomInput.addEventListener('input', function() {
        const idx = parseInt(this.value, 10);
        if (peaksInstance) {
            peaksInstance.zoom.setZoom(idx);
            updateZoomDisplay(idx);
        }
    });

    // keep slider in sync if zoom changed elsewhere
    peaksInstance.on('zoom.update', function(event) {
        const idx = event.currentZoomIndex !== undefined ? event.currentZoomIndex : event.currentZoom;
        zoomInput.value = idx;
        updateZoomDisplay(idx);
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
    setupRangeOutputs();
    setupAudioElements();
    setupTransport();
    setupSpacebarControl();
});
