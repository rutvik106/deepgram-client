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

            const vm=this

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
                if(!this.isPlaying){
                    console.log("client: sent data to websocket");
                    this.socket.send(e.data);
                }
            };
        },

        async closeMicrophone() {
            this.microphone.stop();
        },

        async start() {

            const vm=this

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

            //vm.socket = new WebSocket('wss://mebot-api.fusionbit.in/audio-to-audio-ws?voice_id=5Cam4Buz2X5KDPU9Kiif');
            vm.socket = new WebSocket('wss://0.0.0.0:8000/audio-to-audio-ws?voice_id=5Cam4Buz2X5KDPU9Kiif');
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
                    this.playNextChunk();
                }

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        async playNextChunk() {
            // If the queue is empty, stop
            if (this.audioQueue.length === 0) {
                if (this.isPlaying) {
                    this.isPlaying = false;
                }
                return;
            }

            // If not already playing, set isPlaying to true
            if (!this.isPlaying) {
                this.isPlaying = true;
            }

            // Get the next audio data chunk
            const audioData = this.audioQueue.shift();

            try {
                const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);

                // Using an arrow function for the onended event
                source.onended = () => this.playNextChunk();
                source.start();
            } catch (error) {
                console.error('Error decoding audio data', error);

                // Continue with the next chunk
                await this.playNextChunk();
            }
        },


        ready() {
            this.init()
        }


    },

}


</script>

