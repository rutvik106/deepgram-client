<template>
    <div>

        <h1>AUDIO TO AUDIO (Using Custom Audio Context)</h1>
        <h5>Click on Ready and then START SPEAKING</h5>

        <button @click="ready">Start Mic</button>

        <p>{{ status }}</p>

    </div>


</template>


<script>

import {decodeAudioData, isSupported} from 'standardized-audio-context';

export default {

    data() {
        return {
            socket: null,

            connected: false,
            microphone: null,

            callingTextToAudioApi: false,

            // audioContext: new (window.AudioContext ||
            //     window.webkitAudioContext ||
            //     window.mozAudioContext ||
            //     window.oAudioContext ||
            //     window.msAudioContext)(),


            audioQueue: [],
            isPlaying: false,

            status: 'All process will print here...',


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

            const audioContext = window.CustomAudioContext;

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

                console.log("-----DATA FROM WS-----")
                console.log(event.data);
                console.log("----- XXX -----")

                const audioData = new Uint8Array(event.data);

                console.log("-----Uint8Array-----")
                console.log(audioData);
                console.log("----- XXX -----")

                this.audioQueue.push(event.data);


                if (!this.isPlaying) {
                    this.playNextChunk(audioContext);
                }

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        async playNextChunk(audioContext) {
            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
                return;
            }

            this.isPlaying = true;
            const audioData = this.audioQueue.shift();

            try {

                console.log("-----audioData-----")
                console.log(audioData);
                console.log("----- XXX -----")

                // console.log("-----audioData BUFFER-----")
                // console.log(audioData.buffer);
                // console.log("----- XXX -----")

                const audioBuffer = await decodeAudioData(audioContext, audioData)
                console.log(audioData)
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = this.playNextChunk;
                source.start();
            } catch (error) {
                console.error("-----audioData-----")
                console.error(audioData);
                console.error("----- XXX -----")

                // console.error("-----audioData BUFFER-----")
                // console.error(audioData.buffer);
                // console.error("----- XXX -----")

                this.isPlaying = false

                this.socket.close()
                console.error('Error decoding audio data', error);
            }
        },

        ready() {
            this.init()
        }


    },

    mounted() {

        isSupported()
            .then((isBrowserSupported) => {

                if (isBrowserSupported) {
                    console.log("BROWSER IS SUPPORTED")
                } else {
                    alert("NOT SUPPORTED")

                }
            })
            .catch(() => {
                alert("ERROR")
            });

    }

}


</script>

