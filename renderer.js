
// Volume
let volume = 100;
let volumeInput = null;
let volumeOutput = null;

// Waveform
let peaksInstance = null;

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

// Initialize and draw waveform using Peaks.js
async function initializeWaveform(fileUrl) {
    const audioElement = document.getElementById('audioElement');

    // Destroy existing peaks instance if it exists
    if (peaksInstance) {
        peaksInstance.destroy();
        peaksInstance = null;
    }

    try {
        // Set the audio source
        audioElement.src = fileUrl;

        console.log('Initializing Peaks.js with file:', fileUrl);

        // Create audio context for Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Initialize Peaks.js with proper configuration
        const options = {
            zoomview: {
                container: document.getElementById('zoomview-container')
            },
            overview: {
                container: document.getElementById('overview-container')
            },
            mediaElement: audioElement,
            webAudio: {
                audioContext: audioContext,
                scale: 128,
                multiChannel: false
            }
        };

        peaksInstance = Peaks.init(options, function(err, peaks) {
            if (err) {
                console.error('Failed to initialize Peaks.js:', err.message);
                return;
            }
            console.log('Peaks.js initialized successfully');
        });

    } catch (error) {
        console.error('Error initializing waveform:', error);
    }
}

// Handle play/pause button
function setupPlayPauseButton() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const audioElement = document.getElementById('audioElement');

    if (!playPauseBtn) {
        console.warn('Play/Pause button not found');
        return;
    }

    playPauseBtn.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play();
            console.log('Playing audio');
        } else {
            audioElement.pause();
            console.log('Paused audio');
        }
    });

    // Update button appearance based on play/pause state
    audioElement.addEventListener('play', () => {
        playPauseBtn.classList.remove('btn-primary');
        playPauseBtn.classList.add('btn-danger');
        playPauseBtn.textContent = '⏸';
        playPauseBtn.setAttribute('aria-label', 'Pause');
    });

    audioElement.addEventListener('pause', () => {
        playPauseBtn.classList.remove('btn-danger');
        playPauseBtn.classList.add('btn-primary');
        playPauseBtn.textContent = '▶';
        playPauseBtn.setAttribute('aria-label', 'Play');
    });
}

// Handle audio file loading
function setupAudioFileInput() {
    const audioFileInput = document.getElementById('audioFile');

    audioFileInput.addEventListener('click', async (e) => {
        // Prevent the default file picker
        e.preventDefault();

        const filePath = await window.electronAPI.openFile();
        if (filePath) {
            console.log('Loading file:', filePath);
            
            // Extract just the filename to display
            const fileName = filePath.split('\\').pop();
            audioFileInput.value = '';  // Clear the input
            
            // Create a mock file list display
            const fileLabel = document.createElement('span');
            fileLabel.textContent = ` - ${fileName}`;
            fileLabel.id = 'selectedFileName';
            
            // Remove old label if exists
            const oldLabel = document.getElementById('selectedFileName');
            if (oldLabel) oldLabel.remove();
            
            // Add new label next to input
            audioFileInput.parentElement.appendChild(fileLabel);
            
            // Convert file path to file:// URL for audio element
            const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');

            console.log('File URL:', fileUrl);

            // Initialize waveform
            await initializeWaveform(fileUrl);

            // Dispatch custom event with the file path and URL for other components to listen to
            window.dispatchEvent(new CustomEvent('audioFileLoaded', {
                detail: { filePath, fileUrl }
            }));
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    setupRangeOutputs();
    setupPlayPauseButton();
    setupAudioFileInput();
});
