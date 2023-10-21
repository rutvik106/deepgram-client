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

            isPlaying: false,

            status: 'USING PCM Data... ',


            audioQueue: []

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


            };

            this.microphone.onstop = () => {
                console.log("client: microphone closed");
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

                vm.audioQueue.push(event.data);

                if (!this.isPlaying) {

                    vm.playNextChunk();

                    // vm.getPCMData(event.data)
                    //     .then(({ leftChannelData, rightChannelData }) => {
                    //         vm.playPCMData(leftChannelData, rightChannelData);
                    //     })
                    //     .catch(error => {
                    //         console.error("Error decoding audio:", error);
                    //     });
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
            const arrayBuffer = this.audioQueue.shift();

            try {
                const { leftChannelData, rightChannelData } = await this.getPCMData(arrayBuffer);
                await this.playPCMData(leftChannelData, rightChannelData);
            } catch (error) {
                console.error("Error decoding audio:", error);
            }
        },


        async getPCMData(arrayBuffer) {
            const vm=this
            const audioBuffer = await vm.audioContext.decodeAudioData(arrayBuffer);
            const leftChannelData = audioBuffer.getChannelData(0);

            let rightChannelData;

            if (audioBuffer.numberOfChannels > 1) {
                rightChannelData = audioBuffer.getChannelData(1);
            } else {
                rightChannelData = null; // or set it to leftChannelData if you want both channels to be the same for mono
            }

            return {leftChannelData, rightChannelData};
        },

        async playPCMData(leftChannelData, rightChannelData, sampleRate = 44100) {
            const vm=this

            const numberOfChannels = rightChannelData ? 2 : 1;

            // Create an empty stereo buffer at the sample rate of the AudioContext
            const buffer = vm.audioContext.createBuffer(numberOfChannels, leftChannelData.length, sampleRate);

            // Copy the PCM data into the buffer's channels
            buffer.copyToChannel(leftChannelData, 0, 0); // 0 for left channel

            if (rightChannelData) {
                buffer.copyToChannel(rightChannelData, 1, 0); // 1 for right channel
            }
            // Create a buffer source for playback
            const source = vm.audioContext.createBufferSource();
            source.buffer = buffer;

            // Connect the buffer source to the context's destination (the speakers)
            source.connect(vm.audioContext.destination);

            // Play the audio
            source.start(0);

            source.onended = () => {
                this.isPlaying = false;
                this.playNextChunk(); // Try playing the next chunk, if any.
            };
        },




        ready() {
            this.init()
        }


    },

}


</script>

