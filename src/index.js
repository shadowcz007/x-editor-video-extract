/**
 * Build styles
 */
require('./index.css').toString();

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
            input: this.api.styles.input + " video-extract-info__caption",
            button: this.api.styles.button,
            settingsButton: this.api.styles.settingsButton,
            settingsButtonActive: this.api.styles.settingsButtonActive,

            wrapperBlock: "video-extract",
            addButton: "add",
            actions: "video-extract-actions",
            frames: "video-frames",
            screenshotBtn: "screenshot-btn"
        };



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
        if (this.data && this.data.frames) {
            let createGIF = this._createGIFBtn();
            //存储视频帧的
            let videoFrames = this._createFrames();
            this.wrapper.block.appendChild(createGIF);
            this.wrapper.block.appendChild(videoFrames);
            return this.wrapper;
        };

        const input = document.createElement('input');

        const button = document.createElement("div");
        button.classList.add(this.CSS.addButton);
        button.innerHTML = `<a class="uk-icon-button" uk-icon="plus" data-tip="从本地添加"></a>`;

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
                    let url = URL.createObjectURL(file);

                    this._createVideo(url);

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

        let screenshot = document.createElement("button");
        screenshot.innerHTML = `截屏`;
        screenshot.classList.add(this.CSS.button);
        screenshot.classList.add(this.CSS.screenshotBtn);

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
        video.controls = true;

        video.addEventListener("loadedmetadata", (e) => {
            // console.log(e);
            if (!video.getAttribute("width")) {

                this.wrapper.block.classList.toggle(this.CSS.loading);

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

                videoInfo.classList.add("video-extract-info");
                videoInfo.innerHTML = `
              <h5 contentEditable='true' class="${this.CSS.input}" data-placeholder="输入视频描述"></h5>
              <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                  <li>画面长 ${e.target.videoWidth} px</li>
                  <li>画面高 ${e.target.videoHeight} px</li>
              </ul>
              <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                  <li>宽高比 ${ratio.num}</li>
                  <li>${ratio.desc}</li>
              </ul>
              <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                  <li>时长 ${time.num} 秒</li>
                  <li>${time.desc}</li>
              </ul>
              <ul class="uk-comment-meta uk-subnav uk-subnav-divider ">
                  <li class="current-time">当前位于 0 秒</li>
                  <li> - </li>
              </ul>
          `;

            };

        });

        video.addEventListener('timeupdate', function() {
            videoInfo.querySelector(".current-time").innerText = "当前位于 " + video.currentTime.toFixed(1) + " 秒";
        });


        this.api.listeners.on(screenshot, 'click', (e) => {
            e.preventDefault();
            if (screenshot.getAttribute("clicked") == "1") {
                return;
            };
            screenshot.setAttribute("clicked", "1");

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
                height: video.videoHeight
            };

            this.data.frames.push(frame);

            //如果 output有指定
            // if (this.config.output != null) {

            //     // this.api.blocks.delete(this.index);
            //     this.api.blocks.insert(this.config.output, {
            //         url: base64,
            //         quote: true,
            //         caption: this._getTime(currentTime).num

            //     });
            //     screenshot.setAttribute("data-count", this.data.frames.length);

            // };

            let frameImg = this._createFrame(frame);
            videoFrames.appendChild(frameImg);

            setTimeout(() => {
                screenshot.setAttribute("clicked", "0");
            }, 200);

        });

        videoRightPan.appendChild(videoInfo);
        // actions.appendChild(playpause);
        actions.appendChild(screenshot);
        actions.appendChild(createGIF);
        actions.appendChild(videoFrames);

        // videoRightPan.appendChild(actions);

        videoDiv.appendChild(video);
        // videoDiv.appendChild(controls);
        videoContainer.appendChild(videoDiv);
        videoContainer.appendChild(videoRightPan);


        this.wrapper.block.innerHTML = "";
        this.wrapper.block.appendChild(videoContainer);
        this.wrapper.block.appendChild(actions);

    };


    _createFrame(frame) {
        let frameImg = document.createElement("div");
        frameImg.classList.add("frame");
        frameImg.setAttribute("frame-id", frame.id);
        frameImg.setAttribute("data-index", frame.index);
        let imgurl = URL.createObjectURL(this._dataURLtoBlob(frame.url));
        frameImg.innerHTML = `
      <img data-src="${imgurl}" data-width="${frame.width}" data-height="${frame.height}" alt="${frame.currentTime}" uk-img>
      `;

        frameImg.addEventListener("click", (e) => {
            e.preventDefault();
            // console.log(e);
            this.data.frames = this.data.frames.filter(frame => frame.id != id);
            frameImg.remove();
            // screenshotFrames.querySelector(".uk-badge").innerText = this.data.frames.length;
        });

        return frameImg;
    }


    _createFrames() {
        let videoFrames = document.createElement("div");
        videoFrames.classList.add(this.CSS.frames);
        if (this.data && this.data.frames) {

            Array.from(this.data.frames, f => {
                let frame = this._createFrame(f);
                videoFrames.appendChild(frame);
            });
        }
        return videoFrames
    }

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