
// import worklet node for tempo/pitch processing (using relative path so module loader can locate it)
import { SoundTouchNode } from './node_modules/@soundtouchjs/audio-worklet/dist/index.js';

// Volume
let volume = 100;
let volumeInput = null;
let volumeOutput = null;

// playback speed (percent) and elements
let speed = 100;
let speedInput = null;
let speedOutput = null;

// pitch (semitones) and elements (future use)
let pitch = 0;
let pitchInput = null;
let pitchOutput = null;

// audio context and decoded buffer for SoundTouch playback
let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;

// SoundTouch player adapter (custom Peaks player)
let playerAdapter = null;
let gainNode = null; // for volume control

// Peaks.js waveform instance (global)
let peaksInstance = null;
let selectedSegment = null; // currently highlighted segment to loop

/**
 * Adapter implementing the Peaks player interface backed by SoundTouchJS.
 * Controls playback of the decoded audioBuffer and reports time updates to
 * Peaks so the waveform playhead stays in sync.
 */
class SoundTouchPlayerAdapter {
    constructor(context, buffer) {
        this.audioContext = context;
        this.audioBuffer = buffer;
        this.stNode = null;          // AudioWorklet node
        this.source = null;          // current buffer source
        this.currentTime = 0;
        this.playing = false;
        this.peaks = null;
        this.playStartTime = 0;      // audioContext.currentTime when playback started

        // gainNode allows volume control
        gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume / 100;
        gainNode.connect(this.audioContext.destination);
    }

    async init(peaksInstance) {
        this.peaks = peaksInstance;
        // register the audio worklet processor
        await SoundTouchNode.register(this.audioContext,
            './node_modules/@soundtouchjs/audio-worklet/dist/soundtouch-processor.js');
        this.stNode = new SoundTouchNode(this.audioContext);
        this.stNode.connect(gainNode);
        this.stNode.tempo.value = speed / 100;
        return Promise.resolve();
    }

    _startPolling() {
        const step = () => {
            if (!this.playing) return;
            this.currentTime = this.audioContext.currentTime - this.playStartTime;
            this.peaks.emit('player.timeupdate', this.currentTime);
            if (this.currentTime >= this.getDuration()) {
                this.playing = false;
                this.peaks.emit('player.ended');
            } else {
                requestAnimationFrame(step);
            }
        };
        step();
    }

    play() {
        if (this.playing) return Promise.resolve();
        // create a fresh buffer source for each playback
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.onended = () => {
            this.playing = false;
            this.peaks.emit('player.ended');
        };
        this.source.connect(this.stNode);
        this.playStartTime = this.audioContext.currentTime - this.currentTime;
        this.source.start(0, this.currentTime);
        this.playing = true;
        this.peaks.emit('player.playing', this.currentTime);
        this._startPolling();
        return Promise.resolve();
    }

    pause() {
        if (!this.playing) return Promise.resolve();
        if (this.source) {
            this.source.stop();
            this.source.disconnect();
        }
        this.playing = false;
        this.peaks.emit('player.pause', this.currentTime);
        return Promise.resolve();
    }

    seek(time) {
        this.currentTime = time;
        if (this.playing) {
            return this.pause().then(() => this.play());
        }
        this.peaks.emit('player.seeked', time);
        return Promise.resolve();
    }

    getCurrentTime() {
        return this.currentTime;
    }

    getDuration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }

    isPlaying() {
        return this.playing;
    }

    isSeeking() {
        return false;
    }

    destroy() {
        this.pause();
        if (this.stNode) {
            this.stNode.disconnect();
        }
    }
}

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
        if (gainNode) {
            gainNode.gain.value = volume / 100;
        }
    });

    // Speed (tempo) control
    // slider ranges 25–125 and represents percent of normal playback
    speedInput = document.getElementById('rangeSpeed');
    speedOutput = document.getElementById('outputSpeed');
    if (speedInput && speedOutput) {
        speedOutput.textContent = `${speedInput.value}%`;
        speedInput.addEventListener('input', function () {
            speed = parseInt(this.value, 10);
            speedOutput.textContent = `${speed}%`;
            applyPlaybackSpeed();
        });
    }

    // Pitch - placeholder; library included but not used yet
    pitchInput = document.getElementById('rangePitch');
    pitchOutput = document.getElementById('outputPitch');
    if (pitchInput && pitchOutput) {
        pitchOutput.textContent = pitchInput.value;
        pitchInput.addEventListener('input', function () {
            pitch = parseInt(this.value, 10);
            pitchOutput.textContent = pitch;
            // pitch adjustment not implemented; SoundTouchJS could be used here
        });
    }
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

    // the <audio> element is now only used for legacy display; playback is
    // handled by our SoundTouch adapter, so we keep it paused.
    if (audioElement) {
        audioElement.controls = false;
    }

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

        // decode to AudioBuffer for SoundTouch and peaks
        const reader = new FileReader();
        reader.onload = function(evt) {
            const arrayBuffer = evt.target.result;
            audioContext.decodeAudioData(arrayBuffer).then(buffer => {
                audioBuffer = buffer;
                // rebuild waveform / player
                selectedSegment = null;  // clear any previous segment
                drawWaveForm();
            }).catch(err => console.error('decodeAudioData error', err));
        };
        reader.readAsArrayBuffer(audioFile);

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
        if (!peaksInstance) return;
        // apply speed in case it changed
        applyPlaybackSpeed();
        if (peaksInstance.player.isPlaying()) {
            peaksInstance.player.pause();
            btnPlayPause.innerHTML = playString;
            btnPlayPause.classList.remove("btn-success");
            btnPlayPause.classList.add("btn-outline-primary");
        } else {
            if (selectedSegment) {
                peaksInstance.player.playSegment(selectedSegment, true);
            } else {
                peaksInstance.player.play();
            }
            btnPlayPause.innerHTML = pauseString;
            btnPlayPause.classList.remove("btn-outline-primary");
            btnPlayPause.classList.add("btn-success");
        }
        playing = !playing;
    });

    // rewind
    btnRewind.addEventListener("click", function(){
        if (selectedSegment && peaksInstance) {
            peaksInstance.player.pause();
            selectedSegment = null;
        }
        if (peaksInstance) {
            peaksInstance.player.seek(0);
        }
    });

    // forward
    btnForward.addEventListener("click", function(){
        if (selectedSegment && peaksInstance) {
            peaksInstance.player.pause();
            selectedSegment = null;
        }
        if (peaksInstance) {
            const t = peaksInstance.player.getCurrentTime() + 5;
            peaksInstance.player.seek(t);
        }
    });
}

function drawWaveForm() {
    if (!audioBuffer) {
        console.warn('No audio buffer available for waveform');
        return;
    }

    // destroy existing instance if any
    if (peaksInstance) {
        peaksInstance.destroy();
        peaksInstance = null;
    }

    // before creating adapter we must register the audio worklet processor
    SoundTouchNode.register(audioContext,
        './node_modules/@soundtouchjs/audio-worklet/dist/soundtouch-processor.js')
    .then(() => {
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
            // supply our custom player adapter rather than a media element
            player: new SoundTouchPlayerAdapter(audioContext, audioBuffer),
            webAudio: {
                audioContext: audioContext,
                scale: 128,
                multiChannel: true,             // render separate left/right channels
                audioBuffer: audioBuffer
            }
        };

        (function (Peaks) {
            Peaks.init(options, function (err, peaks) {
            if (err) {
                console.error(`Failed to initialize Peaks instance: ${err.message}`);
                return;
            }

            peaksInstance = peaks; // keep global reference
            playerAdapter = options.player; // keep adapter reference if needed
            // apply current speed setting to adapter
            applyPlaybackSpeed();

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
    }); // end of SoundTouchNode.register().then()
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

    // @todo FIX THIS!!!
    // allow mouse wheel over the zoom view container to adjust zoom level
    const zoomViewEl = document.getElementById('zoomview-container');
    if (zoomViewEl) {
        zoomViewEl.addEventListener('wheel', function(e) {
            // prevent the page from scrolling
            e.preventDefault();
            if (!peaksInstance) return;
            const currentIdx = parseInt(zoomInput.value, 10);
            // wheel down -> zoom out (lower index), wheel up -> zoom in
            const delta = e.deltaY > 0 ? -1 : 1;
            let newIdx = currentIdx + delta;
            newIdx = Math.max(0, Math.min(zoomLevels.length - 1, newIdx));
            if (newIdx !== currentIdx) {
                zoomInput.value = newIdx;
                peaksInstance.zoom.setZoom(newIdx);
                updateZoomDisplay(newIdx);
            }
        });
    }
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

// adjust playback speed via SoundTouch adapter (tempo)
function applyPlaybackSpeed() {
    const rate = speed / 100;
    if (playerAdapter && playerAdapter.stNode) {
        playerAdapter.stNode.tempo.value = rate;
    }
    if (peaksInstance && peaksInstance.player && typeof peaksInstance.player.setPlaybackRate === 'function') {
        try { peaksInstance.player.setPlaybackRate(rate); } catch {};
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setupRangeOutputs();
    setupAudioElements();
    setupTransport();
    setupSpacebarControl();
});
