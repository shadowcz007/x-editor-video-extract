/**
 * Build styles
 */
require('./index.css').toString();

const RecordRTC = require('recordrtc/RecordRTC');
// const mobilenet = require('@tensorflow-models/mobilenet');
const smartcrop = require("smartcrop");

/**
 * video-extract Tool for the Editor.js 2.0
 */
class VideoExtract {

    static get toolbox() {
        return {
            title: '视频拆解',
            icon: require('./../assets/icon.svg').default,
        };
    }

    constructor({ data, api, config }) {
        this.data = data;
        this.api = api;

        this.config = config || {};
        //TinyYoloV3View 、SimpleImage
        this.config.output = this.config.output || null;

        this.index = this.api.blocks.getCurrentBlockIndex() + 1;

        this.wrapper = {
            block: document.createElement('div'),
            renderSettings: document.createElement('div')
        };

        this.CSS = {
            baseClass: this.api.styles.block,
            loading: this.api.styles.loader,
            input: this.api.styles.input,
            button: this.api.styles.button,
            settingsButton: this.api.styles.settingsButton,
            settingsButtonActive: this.api.styles.settingsButtonActive,

            wrapperBlock: "video-extract",
            actions: "video-extract-actions",
            frames: "video-frames",
            range: "video-range",
            unSelected: "un-selected",
            screenshotBtn: "screenshot-btn"
        };

        //视频
        this.video = null;
        //帧率
        this.frameRate = 1;
        //抽取的帧
        this.videoFrames = null;

        //
        this.startIndex = 0;
        this.endIndex = 0;

        // console.log(mobilenet);
        // this.model = mobilenet.load({
        //   version: 2,
        //   alpha: 0.5,
        //   modelUrl: "web_model/test/model.json",
        //   inputRange: [0, 1]
        // });

    }

    render() {

        this.wrapper.block = document.createElement('div');
        this.wrapper.block.setAttribute("data-title", "视频拆解");
        this.wrapper.block.classList.add(this.CSS.wrapperBlock);
        if (this.data && this.data.frames && this.data.frames.length > 0) {
            //创建gif按钮
            let createGIF = this._createGIFBtn();

            //存储视频帧的
            let videoFrames = this._createFrames();
            this.wrapper.block.appendChild(createGIF);
            this.wrapper.block.appendChild(videoFrames);
            return this.wrapper.block;
        };

        const input = document.createElement('input');

        const button = document.createElement("button");
        button.classList.add(this.CSS.button);
        button.innerHTML = `从本地添加`;

        button.addEventListener("click", (e) => {
            e.preventDefault();
            input.click();
        });

        input.setAttribute("type", "file");
        input.setAttribute("accept", 'video/*');

        input.value = this.data && this.data.url ? this.data.url : '';
        input.addEventListener("change", (e) => {
            e.preventDefault();
            if (e.target.files.length == 1 && !this.wrapper.block.querySelector("video")) {
                let file = e.target.files[0];
                if (file.type.match(/video\//)) {
                    console.log(file)
                    let url = URL.createObjectURL(file);

                    this._createVideo(url);
                    this.wrapper.block.classList.toggle(this.CSS.loading);
                };
            }
        });

        this.wrapper.block.appendChild(input);
        this.wrapper.block.appendChild(button);

        button.click();
        return this.wrapper.block;
    }

    save(blockContent) {
        let frames = this.data.frames;
        //console.log(frames)
        // frames = Array.from(frames, f => {
        //     let time = f.getAttribute("alt");
        //     let imgurl = f.getAttribute("src");
        //     return { time, imgurl }
        // });

        let sortByTime = (a, b) => {
            return a.currentTime - b.currentTime
        };

        frames = frames.sort(sortByTime);

        return {
            ratio: this.data.ratio,
            time: this.data.time,
            width: this.data.width,
            height: this.data.height,
            frames: frames
        }
    }

    validate(savedData) {
        if (!(savedData.ratio && savedData.time && savedData.width && savedData.height)) {
            return false;
        }

        return true;
    }

    _createGIFBtn() {
        let createGIF = document.createElement("button");
        createGIF.innerHTML = `生成GIF`;
        createGIF.classList.add(this.CSS.button);
        // this.api.blocks.delete(this.index);
        this.api.listeners.on(createGIF, "click", e => {
            e.preventDefault();
            // console.log(this.data)
            if (this.config.output == "imgs2gif" && this.data.frames.length > 0) {
                this.api.blocks.insert(this.config.output, {
                    images: Array.from(this.data.frames, f => f.url),
                    // quote: true,
                    // caption: this._getTime(currentTime).num
                });
            };
        });
        return createGIF
    }

    _createVideo(url) {

        this.wrapper.block.classList.add(this.CSS.loading);

        const videoContainer = document.createElement("div");
        videoContainer.classList.add("origin");

        const videoRightPan = document.createElement("div");
        videoRightPan.classList.add("right");

        const actions = document.createElement("div");
        actions.classList.add(this.CSS.actions);

        // let playpause = document.createElement("button");
        // playpause.innerText = "播放";
        // playpause.classList.add(this.CSS.button);

        // let screenshot = document.createElement("button");
        // screenshot.innerHTML = `截屏`;
        // screenshot.classList.add(this.CSS.button);
        // screenshot.classList.add(this.CSS.screenshotBtn);

        let createGIF = this._createGIFBtn();

        //存储视频帧的
        let videoFrames = document.createElement("div");
        videoFrames.classList.add(this.CSS.frames);

        //原始视频本身
        const videoDiv = document.createElement("div");
        videoDiv.classList.add("video");

        const videoInfo = document.createElement("div");

        const video = document.createElement("video");
        video.src = url;
        video.setAttribute("preload", "metadata");
        video.controls = false;
        video.muted = false;
        video.οncοntextmenu = function() {
            return false;
        }

        video.addEventListener("loadedmetadata", (e) => {
            // console.log('loadedmetadata');
            if (!video.getAttribute("width")) {

                video.setAttribute("width", e.target.videoWidth);
                video.setAttribute("height", e.target.videoHeight);

                let ratio = this._getAspectRatio(e.target.videoWidth, e.target.videoHeight);
                let time = this._getTime(e.target.duration);
                //需要保存下来的信息
                this.data = {
                    ratio: ratio,
                    time: time,
                    width: e.target.videoWidth,
                    height: e.target.videoHeight,
                    video: video,
                    index: 0,
                    frames: []
                };

                //         videoInfo.classList.add("video-extract-info");
                //         videoInfo.innerHTML = `
                //       <h5 contentEditable='true' class="${this.CSS.input}" data-placeholder="输入视频描述"></h5>
                //       <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                //           <li>画面长 ${e.target.videoWidth} px</li>
                //           <li>画面高 ${e.target.videoHeight} px</li>
                //       </ul>
                //       <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                //           <li>宽高比 ${ratio.num}</li>
                //           <li>${ratio.desc}</li>
                //       </ul>
                //       <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                //           <li>时长 ${time.num} 秒</li>
                //           <li>${time.desc}</li>
                //       </ul>
                //       <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                //           <li class="current-time">当前位于 0 秒</li>
                //           <li> - </li>
                //       </ul>
                //   `;
                video.currentTime = 0.1;
                this._extractFrames();
            };

        });

        // video.addEventListener("onloadeddata", () => {
        //     this._extractFrames();
        // });
        // video.addEventListener('timeupdate', function() {
        //     console.log('timeupdate');
        //     //videoInfo.querySelector(".current-time").innerText = "当前位于 " + video.currentTime.toFixed(1) + " 秒";
        // });


        // this.api.listeners.on(screenshot, 'click', (e) => {
        //     e.preventDefault();
        //     if (screenshot.getAttribute("clicked") == "1") {
        //         return;
        //     };
        //     screenshot.setAttribute("clicked", "1");

        //     this._extractFrames();

        //     //如果 output有指定
        //     // if (this.config.output != null) {

        //     //     // this.api.blocks.delete(this.index);
        //     //     this.api.blocks.insert(this.config.output, {
        //     //         url: base64,
        //     //         quote: true,
        //     //         caption: this._getTime(currentTime).num

        //     //     });
        //     //     screenshot.setAttribute("data-count", this.data.frames.length);

        //     // };

        //     setTimeout(() => {
        //         screenshot.setAttribute("clicked", "0");
        //     }, 200);

        // });

        //videoRightPan.appendChild(videoInfo);
        // actions.appendChild(playpause);
        //actions.appendChild(screenshot);
        //范围开始-结束
        let startRange = document.createElement("input"),
            endRange = document.createElement("input");
        startRange.classList.add(this.CSS.input);
        startRange.classList.add(this.CSS.range);
        endRange.classList.add(this.CSS.input);
        endRange.classList.add(this.CSS.range);
        startRange.setAttribute("type", "number");
        startRange.setAttribute("min", "1");
        endRange.setAttribute("type", "number");
        endRange.setAttribute("min", "2");
        this.updateEndRange = (maxNum) => {
            endRange.setAttribute("max", maxNum);
            endRange.value = maxNum;
            startRange.value = 0;
            startRange.setAttribute("max", maxNum - 1);
            this.endIndex = maxNum - 1;
        };
        let startSpan = document.createElement("span");
        startSpan.innerText = "开始";
        startSpan.style.width = "136px";
        let endSpan = document.createElement("span");
        endSpan.innerText = "结束";
        endSpan.style.width = "136px";

        startRange.addEventListener("change", (e) => {
            e.preventDefault();
            this.startIndex = (~~startRange.value) - 1;
            this._selectedFrames();
        });
        endRange.addEventListener("change", (e) => {
            e.preventDefault();
            this.endIndex = (~~endRange.value) - 1;
            this._selectedFrames();
        });


        actions.appendChild(startSpan);
        actions.appendChild(startRange);
        actions.appendChild(endSpan);
        actions.appendChild(endRange);

        actions.appendChild(createGIF);


        // videoRightPan.appendChild(actions);

        //videoDiv.appendChild(video);
        // videoDiv.appendChild(controls);
        videoContainer.appendChild(video);
        //videoContainer.appendChild(videoRightPan);

        this.video = video;
        this.videoFrames = videoFrames;

        this.wrapper.block.innerHTML = "";
        this.wrapper.block.appendChild(videoContainer);
        this.wrapper.block.appendChild(actions);
        this.wrapper.block.appendChild(videoFrames);

        //分离音频
        //setTimeout(() => { this._extractAudio(); }, 1000)
    };


    _selectedFrames() {
        let startIndex = this.startIndex,
            endIndex = this.endIndex;
        for (let i = 0; i < startIndex; i++) {
            let frame = this.data.frames[i];
            if (!(this.CSS.unSelected in frame.element.classList)) {
                frame.element.classList.add(this.CSS.unSelected);
            };
            this.data.frames[i].selected = false;
        };

        for (let i = startIndex; i < endIndex + 1; i++) {
            let frame = this.data.frames[i];
            frame.element.classList.remove(this.CSS.unSelected);
            this.data.frames[i].selected = true;
        };

        for (let i = endIndex + 1; i < this.data.frames.length; i++) {
            let frame = this.data.frames[i];
            if (!(this.CSS.unSelected in frame.element.classList)) {
                frame.element.classList.add(this.CSS.unSelected);
            };
            this.data.frames[i].selected = false;
        };

    }

    _extractFrames() {
        let video = this.video;
        if (!this.video.seeking) {
            let base64 = this._screenshotForVideo(video);
            let currentTime = video.currentTime;
            let id = this.data.frames.length + "_" + (new Date()).getTime();

            if (this.data && !this.data.frames) {
                this.data.frames = [];
            };

            let frame = {
                index: this.data.frames.length + 1,
                url: base64,
                currentTime: currentTime,
                id: id,
                width: video.videoWidth,
                height: video.videoHeight,
                selected: true
            };

            video.currentTime += 1 / this.frameRate;


            //console.log(this.data.frames.length)

            let frameImg = this._createFrame(frame);
            frame.element = frameImg;

            this.videoFrames.appendChild(frameImg);

            this.data.frames.push(frame);
        }

        //console.log(this.video.seeking)
        window.requestAnimationFrame(() => {
            if (this.video.currentTime < this.data.time.num - 0.1) {
                this._extractFrames();
            } else {
                this.updateEndRange(this.data.frames.length);
                // this.wrapper.block.classList.toggle(this.CSS.loading);
            }
        })

    }

    _extractAudio() {
        var audioStream = new MediaStream();
        let videoStream = this.video.captureStream();

        let audio = document.createElement("audio");
        audio.controls = true;
        this.recorder = RecordRTC(audioStream, {
            type: 'audio',
            mimeType: 'audio/webm',
            previewStream: (s) => {
                audio.src = s;
            }
        });
        // "getTracks" is RecordRTC's built-in function
        RecordRTC.getTracks(videoStream, 'audio').forEach(function(audioTrack) {
            audioStream.addTrack(audioTrack);
        });
        audio.srcObject = audioStream;
        console.log(this.video, videoStream)
        this.wrapper.block.appendChild(audio)
    }


    _createFrame(frame) {
        let frameImg = document.createElement("div");
        frameImg.classList.add("frame");

        frameImg.setAttribute("frame-id", frame.id);
        frameImg.setAttribute("data-index", frame.index);
        let imgurl = URL.createObjectURL(this._dataURLtoBlob(frame.url));
        frameImg.innerHTML = `
      <img src="${imgurl}" width="${frame.width}" height="${frame.height}" alt="${frame.currentTime}">
      `;
        frameImg.addEventListener("click", (e) => {
            e.preventDefault();
            if (frame.index > this.endIndex - 2) {
                this.endIndex = frame.index - 1;
            } else {
                this.startIndex = frame.index;
            }

            this._selectedFrames();
            // this.data.frames = this.data.frames.filter(f => f.id != frame.id);
            // frameImg.remove();
        });
        return frameImg;
    }


    _createFrames() {
        let videoFrames = document.createElement("div");
        videoFrames.classList.add(this.CSS.frames);
        if (this.data && this.data.frames && this.data.frames.length > 0) {

            let sortByIndex = (a, b) => {
                return a.index - b.index
            };
            this.data.frames = this.data.frames.sort(sortByIndex);

            Array.from(this.data.frames, f => {
                let frame = this._createFrame(f);
                videoFrames.appendChild(frame);
            });
        };
        return videoFrames
    };

    _screenshotForVideo(video) {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        return canvas.toDataURL();
    }

    _dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    //计算宽高比
    //4:3、16:9和2.35:1
    _getAspectRatio(width, height) {
        let n = parseFloat((width / height).toFixed(2));
        let desc = "-"
        if (Math.abs(n - 0.56) < 0.05) {
            console.log("--竖屏---");
            desc = "竖屏";
        };
        if (Math.abs(n - 4 / 3) < 0.05) {
            console.log("--传统---");
            n = "4:3";
            desc = "传统";
        };
        if (Math.abs(n - 16 / 9) < 0.05) {
            console.log("--宽屏---");
            n = "16:9";
            desc = "宽屏";
        };
        if (Math.abs(n - 2.35) < 0.05) {
            console.log("--电影---");
            n = "2.35";
            desc = "电影";
        };
        return {
            num: n,
            desc: desc
        }
    }

    _getTime(time) {
        let n = parseFloat(time.toFixed(1));
        let desc = "-";

        if (n <= 16) {
            desc = "短视频";
        } else if (n > 60) {
            desc = "长视频";
        };

        return {
            num: n,
            desc: desc
        }
    }

}


module.exports = VideoExtract;