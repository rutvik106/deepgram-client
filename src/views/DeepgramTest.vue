<template>
    <div>
        <h1>DEEPGRAM</h1>
        <h5>START SPEAKING</h5>
        <p>{{ text }}</p>

    </div>
</template>


<script>

export default {

    data() {
        return {
            socket: null,
            connected: false,
            microphone: null,
            text: '',
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

            this.socket = new WebSocket('wss://deepgram-test-qw7lwc6szq-uw.a.run.app/listen');

            this.socket.addEventListener("open", async () => {
                this.connected = true;
                console.log("WebSocket is open.");
                await this.start();
            });

            this.socket.addEventListener("message", (event) => {
                const message = event.data;
                console.log("Received message:", message);
                this.text = this.text + ' \n \n' + message
                // Handle the incoming message as needed
            });


            this.socket.addEventListener("transcript-completed", () => {
               alert('SILENCE WAS DETECTED')
            });

            this.socket.addEventListener("transcript", (event) => {
                const message = event.data;
                //console.log("transcript:", message);

                // Handle the incoming message as needed
            });

            this.socket.addEventListener("close", () => {
                this.connected = false;
                console.log("WebSocket is closed.");
            });

        }

    },

    mounted() {

        this.init()

    }

}


</script>

