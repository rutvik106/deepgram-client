<template>
    <div>

        <h1>AUDIO TO AUDIO (Using HOWLER JS)</h1>
        <h5>Click on Ready and then START SPEAKING</h5>

        <button @click="ready">Start Mic</button>
        <button @click="play">PLAY</button>

        <p>{{ status }}</p>

    </div>


</template>


<script>

export default {

    data() {
        return {
            socket: null,

            connected: false,
            microphone: null,

            callingTextToAudioApi: false,

            audioContext: new (window.AudioContext || window.webkitAudioContext)(),
            audioQueue: [],
            isPlaying: false,

            status: 'All process will print here...',

            sourceBuffer: null,
            mediaSource: new MediaSource(),
            audio: new Audio()


        };
    },

    methods: {

        async getMicrophone() {

            const userMedia = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            return new MediaRecorder(userMedia);

        },

        async openMicrophone() {

            const vm = this

            await this.microphone.start(3000);

            this.microphone.onstart = () => {
                console.log("client: microphone opened");

                vm.status = vm.status + " | Mic connected..."

                vm.status = vm.status + " | Start speaking now..."


                document.body.classList.add("recording");
            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");
                document.body.classList.remove("recording");
            };

            this.microphone.ondataavailable = (e) => {
                if (!this.isPlaying) {
                    console.log("client: sent data to websocket");
                    this.socket.send(e.data);
                }
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },

        async start() {

            const vm = this

            vm.status = vm.status + " | Connecting to mic..."


            if (!this.microphone) {
                // open and close the microphone
                this.microphone = await this.getMicrophone();
                await this.openMicrophone();
            } else {
                await this.closeMicrophone();
                this.microphone = null;
            }
        },


        init() {

            let vm = this

            vm.status = vm.status + " | Connecting to socket..."

            vm.socket = new WebSocket('wss://mebot-api.fusionbit.in/audio-to-audio-ws?voice_id=5Cam4Buz2X5KDPU9Kiif');
            //vm.socket.binaryType = 'arraybuffer'

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");

                vm.status = vm.status + " | Socket connected..."


                await vm.start();
            });

            vm.socket.addEventListener("message", (event) => {

                vm.processAudioChunk(event.data);

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        appendBuffer(data) {
            if (!this.sourceBuffer.updating && this.mediaSource.readyState === 'open') {
                console.log("adding buffer")
                this.sourceBuffer.appendBuffer(new Uint8Array(data));
                if (this.audio.paused && this.audio.currentTime === 0) {
                    this.audio.play();  // Start playback after first chunk is appended.
                }
            }
        },

        async playNextChunk() {
            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
                return;
            }

            this.isPlaying = true;
            const audioData = this.audioQueue.shift();

            try {
                const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                source.onended = this.playNextChunk;
                source.start();
            } catch (error) {
                await this.playNextChunk()
                console.error('Error decoding audio data', error);
            }
        },

        ready() {

            this.mediaSource.addEventListener('sourceopen', this.setupSourceBuffer);
            const audio = new Audio();
            audio.src = URL.createObjectURL(this.mediaSource);
            audio.play();

            this.init()
        },

        setupSourceBuffer() {
            this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        },

        processAudioChunk(audioChunk) {
            if (this.sourceBuffer && !this.sourceBuffer.updating) {
                this.sourceBuffer.appendBuffer(audioChunk);
            } else {
                // Buffer is currently updating or hasn't been set up yet.
                // You might want to queue the chunk or handle this scenario as needed.
            }
        },

        play() {
            console.log("PLAY")
            this.audio.play();
        }


    },

}


</script>

