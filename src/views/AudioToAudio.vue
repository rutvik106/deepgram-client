<template>
    <div>

        <h1>AUDIO TO AUDIO (Using Websocket and MP3 Decoder) v6</h1>
        <h5>Click on Ready and then START SPEAKING</h5>

        <button @click="ready">Start Mic</button>

        <p>{{ status }}</p>

    </div>


</template>


<script>

import decode, {decoders} from 'audio-decode';

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


        };
    },

    methods: {

        async getMicrophone() {

            const userMedia = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: localStorage.micId,
                    channelCount: 2
                }
            });

            return new MediaRecorder(userMedia);

        },

        async openMicrophone() {

            const vm = this

            navigator.audioSession.type = 'play-and-record';

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
                    //navigator.audioSession.type = 'playback';
                    this.playNextChunk();
                }

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        async playNextChunk() {
            if (this.audioQueue.length === 0) {
                this.isPlaying = false;
                //navigator.audioSession.type = 'play-and-record';
                return;
            }

            this.isPlaying = true;
            const audioData = this.audioQueue.shift();

            try {
                //const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
                //const audioBuffer = await decodeAudio(audioData.buffer);

                console.log("decoders.mp3()")
                await decoders.mp3(); // load & compile decoder
                console.log("decoders.mp3(audioData)")
                const audioBuffer = await decoders.mp3(audioData); // decode
                console.log("DECODING COMPLETE")

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
            this.init()
        }


    },

    async mounted() {

        const vm=this

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: localStorage.micId,
                    channelCount: 2
                }
            });

            // Granted. Store deviceIds for next time
            localStorage.micId = stream.getAudioTracks()[0].getSettings().deviceId;

            if (!navigator.mediaDevices?.enumerateDevices) {
                console.log("enumerateDevices() not supported.");
            } else {
                // List cameras and microphones.
                navigator.mediaDevices
                    .enumerateDevices()
                    .then((devices) => {
                        devices.forEach((device) => {
                            console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
                        });
                    })
                    .catch((err) => {
                        console.error(`${err.name}: ${err.message}`);
                    });
            }

        } catch (error) {
            if (error.name != "OverconstrainedError") {
                throw error;
            }
            // Overconstrained. No suitable replacements found
        }


    }

}


</script>

