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
            connected: false,
            microphone: null,
            text: '',
        };
    },

    methods: {

        async getMicrophone() {

            this.text = this.text + " getting microphone... | "

            const userMedia = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            this.text = this.text + " microphone ready... | "


            return new MediaRecorder(userMedia);

        },

        async openMicrophone() {

            this.text = this.text + " opening microphone... | "


            await this.microphone.start(2000);

            this.microphone.onstart = () => {

                this.text = this.text + " client: microphone opened | "


                console.log("client: microphone opened");
            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");

                this.text = this.text + " client: microphone closed | "


            };

            this.microphone.ondataavailable = (e) => {
                console.log("client: sent data to websocket");

                this.text = this.text + " client: sent data to websocket | "

                this.text = this.text + e.data

                console.log(e.data)

                this.socket.send(e.data);
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },

        async start() {
            if (!this.microphone) {
                // open and close the microphone
                this.text = this.text + " initializing microphone... | "
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

            vm.text = vm.text + " connecting to socket... | "

            vm.socket.addEventListener("open", async () => {
                vm.connected = true;
                console.log("WebSocket is open.");

                vm.text = vm.text + " connecting is connected... | "

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

        ready() {
            this.init()
        }


    },

}


</script>

