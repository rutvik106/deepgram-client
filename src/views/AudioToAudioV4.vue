<template>
    <div>

        <h1>AUDIO TO AUDIO (Using Websocket)</h1>
        <h5>Click on Ready and then START SPEAKING</h5>

        <button @click="ready">Start Mic</button>

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

            status: 'this is using chunks logic from old project',


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

            await this.microphone.start(500);

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
            vm.socket.binaryType = 'arraybuffer'

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");

                vm.status = vm.status + " | Socket connected..."

                await vm.start();
            });

            vm.socket.addEventListener("message", (event) => {

                console.log(event.data);

                const audioData = new Uint8Array(event.data);

                this.audioQueue.push(audioData);

                if (!this.isPlaying) {
                    this.processAudio();
                }

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        async processAudio() {

            const vm = this

            let multiplier = 1

            const chunkSize = 1024 * multiplier; // Adjust this based on your needs

            console.log("Chunk size set to: " + chunkSize)

            let audioBuffer = new Uint8Array();

            console.log("Reading new chunk of buffer")

            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
            }

            const value = this.audioQueue.shift();

            audioBuffer = vm.concatenateUint8Arrays(audioBuffer, value);

            console.log(audioBuffer.length + " > " + chunkSize)

            if (audioBuffer.length >= chunkSize) {
                console.log("Now Playing a chunk of audio")

                await vm.playAudioChunk(audioBuffer);

                audioBuffer = new Uint8Array();
                console.log("Played a chunk")
            }

            // Play any remaining audio buffer
            if (audioBuffer.length > 0) {
                console.log("check A playing remaining buffer")

                await vm.playAudioChunk(audioBuffer)

            }


        },


        async playAudioChunk(buffer) {

            const vm = this

            console.log("Inside playAudioChunk method")

            return new Promise((resolve) => {

                console.log("decodeAudioData")
                vm.audioContext.decodeAudioData(buffer.buffer, (audioBuffer) => {

                    console.log("DECODING SUCCESSFUL")
                    const source = vm.audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(vm.audioContext.destination);

                    source.onended = () => {
                        console.log("Playing ended freeing resources")
                        source.disconnect()
                        source.buffer = null
                        resolve();
                    };

                    console.log("Now Playing...")

                    source.start();

                }, (error) => {
                    console.error('Error decoding audio:', error);
                    resolve();
                });
            });
        },

        concatenateUint8Arrays(arr1, arr2) {
            console.log("concatenateUint8Arrays")
            const result = new Uint8Array(arr1.length + arr2.length);
            result.set(arr1, 0);
            result.set(arr2, arr1.length);
            return result;
        },

        ready() {
            this.init()
        }


    },

}


</script>

