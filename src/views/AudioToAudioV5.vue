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
            //vm.socket.binaryType = 'arraybuffer'

            vm.socket.addEventListener("open", async () => {

                vm.connected = true;

                console.log("WebSocket is open.");

                vm.status = vm.status + " | Socket connected..."

                await vm.start();
            });

            vm.socket.addEventListener("message", async (event) => {

                console.log("-----DATA FROM WS-----")
                console.log(event.data);
                console.log("----- XXX -----")

                const audioBufferChunk = await audioContext.decodeAudioData(this.withWaveHeader(event.data, 2, 44100))
                let source = audioContext.createBufferSource();
                source.buffer = audioBufferChunk;
                source.connect(audioContext.destination);
                source.start(source.buffer.duration);

                // this.audioQueue.push(event.data);
                //
                // if (!this.isPlaying) {
                //     this.playNextChunk(audioContext);
                // }

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

                const audioBuffer = await decodeAudioData(audioContext, audioData)
                console.log(audioData)
                const source = audioContext.createBufferSource();

                source.buffer = audioContext.createBuffer(1, audioBuffer.length, 44100)
                //source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.onended = await this.playNextChunk;
                source.start();
            } catch (error) {
                console.error("-----audioData-----")
                console.error(audioData);
                console.error("----- XXX -----")

                this.isPlaying = false

                this.socket.close()
                console.error('Error decoding audio data', error);
            }
        },

        ready() {
            this.init()
        },

        withWaveHeader(data, numberOfChannels, sampleRate) {
            const header = new ArrayBuffer(44);

            const d = new DataView(header);

            d.setUint8(0, "R".charCodeAt(0));
            d.setUint8(1, "I".charCodeAt(0));
            d.setUint8(2, "F".charCodeAt(0));
            d.setUint8(3, "F".charCodeAt(0));

            d.setUint32(4, data.byteLength / 2 + 44, true);

            d.setUint8(8, "W".charCodeAt(0));
            d.setUint8(9, "A".charCodeAt(0));
            d.setUint8(10, "V".charCodeAt(0));
            d.setUint8(11, "E".charCodeAt(0));
            d.setUint8(12, "f".charCodeAt(0));
            d.setUint8(13, "m".charCodeAt(0));
            d.setUint8(14, "t".charCodeAt(0));
            d.setUint8(15, " ".charCodeAt(0));

            d.setUint32(16, 16, true);
            d.setUint16(20, 1, true);
            d.setUint16(22, numberOfChannels, true);
            d.setUint32(24, sampleRate, true);
            d.setUint32(28, sampleRate * 1 * 2);
            d.setUint16(32, numberOfChannels * 2);
            d.setUint16(34, 16, true);

            d.setUint8(36, "d".charCodeAt(0));
            d.setUint8(37, "a".charCodeAt(0));
            d.setUint8(38, "t".charCodeAt(0));
            d.setUint8(39, "a".charCodeAt(0));
            d.setUint32(40, data.byteLength, true);

            return this.concat(header, data);
        },

        concat(buffer1, buffer2) {
            const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);

            tmp.set(new Uint8Array(buffer1), 0);
            tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

            return tmp.buffer;
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

