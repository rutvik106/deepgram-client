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

            buffer: new Uint8Array()


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
                    this.playAudio(audioData);
                }

            });

            vm.socket.addEventListener("close", () => {
                vm.connected = false;
                console.log("WebSocket is closed.");
            });

        },

        async playAudio(audioBuffer) {

            const vm = this

            //let audioData = vm.base64ToArrayBuffer(audioChunk)
            //let audioBuffer = await vm.decodeMp3ToPCM(audioData)

            vm.buffer = vm.concatTypedArray(vm.buffer, audioBuffer)

            if(vm.buffer.length>=4096){
                let source=vm.audioContext.createBufferSource()
                source.buffer= vm.audioContext.createBuffer(1,vm.buffer.length,44100)
                source.buffer.getChannelData(0).set(vm.buffer)
                source.connect(vm.audioContext.destination)
                source.start()
                vm.buffer=new Uint8Array()
            }

        },

        concatTypedArray(a, b) {
            let result = new Uint8Array(a.length + b.length)
            result.set(a)
            result.set(b, a.length)
            return result
        },

        base64ToArrayBuffer(base64) {
            let binaryString = window.atob(base64)
            let len = binaryString.length
            let bytes = new Uint8Array(len)

            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }

            return bytes.buffer

        },

        async decodeMp3ToPCM(mp3Data) {

            let audioBuffer = await this.audioContext.decodeAudioData(mp3Data)

            return audioBuffer.getChannelData(0)

        },


        ready() {
            this.init()
        }


    },

}


</script>

