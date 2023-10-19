<template>
    <div>

        <h1>AUDIO TO AUDIO (Using Websocket)</h1>
        <h5>Click on Ready and then START SPEAKING</h5>

        <button @click="ready">Click me!</button>

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

            status: 'AUDIO TO AUDIO TEST',


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

            await this.microphone.start(2000);

            this.microphone.onstart = () => {
                console.log("client: microphone opened");
                document.body.classList.add("recording");
            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");
                document.body.classList.remove("recording");
            };

            this.microphone.ondataavailable = (e) => {
                console.log("client: sent data to websocket");
                this.socket.send(e.data);
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },

        async start() {
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

            vm.socket = new WebSocket('wss://mebot-api.fusionbit.in/audio-to-audio-ws?bot_id=3ffd8b2d-2f2d-4a9f-9547-afebc50e384a');
            vm.socket.binaryType = 'arraybuffer'

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");
                await vm.start();
            });

            vm.socket.addEventListener("message", (event) => {
                const message = event.data;
                console.log(event.data);

                const audioData = new Uint8Array(event.data);
                this.audioQueue.push(audioData);
                if (!this.isPlaying) {
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
                console.error('Error decoding audio data', error);
            }
        },

        ready(){
            this.init()
        }


    },

}


</script>

