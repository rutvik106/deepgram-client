<template>
    <div>

        <h1>DEEPGRAM</h1>
        <h5>START SPEAKING</h5>

        <button @click="ready">Ready!</button>

        <p>{{ text }}</p>

    </div>


</template>


<script>

export default {

    data() {
        return {
            socket: null,
            socket2: null,
            connected: false,
            microphone: null,
            text: '',
            callingTextToAudioApi: false,

            audioContext: new (window.AudioContext || window.webkitAudioContext)(),

            isPlaying: false,

            mediaSource: new MediaSource(),
            audio: new Audio(),
            sourceBuffer: null,

            chunks: [],  // Array to store incoming chunks
            audioStack: []  // Array to store incoming chunks

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

            await this.microphone.start(500);

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

            vm.socket = new WebSocket('wss://deepgram-test-qw7lwc6szq-uw.a.run.app/listen');

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");
                await vm.start();
            });

            vm.socket.addEventListener("message", (event) => {
                const message = event.data;
                console.log("Received message: ", message);

                vm.text = vm.text + ' \n \n' + message

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        ready(){
            this.init()
        }


    },

}


</script>

