FROM pytorch/pytorch:2.4.1-cuda12.1-cudnn9-runtime
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN git clone -q --depth 1 https://github.com/xinntao/Real-ESRGAN.git && git clone -q --depth 1 https://github.com/XPixelGroup/BasicSR.git
RUN cd BasicSR && python - <<'PY'
p='setup.py'; s=open(p).read()
s=s.replace("exec(compile(f.read(), version_file, 'exec'))","ns = {}; exec(compile(f.read(), version_file, 'exec'), ns)").replace("return locals()['__version__']","return ns['__version__']")
open(p,'w').write(s)
PY
RUN pip install --no-cache-dir --no-deps ./BasicSR && pip install --no-cache-dir addict future lmdb yapf scikit-image scipy tqdm pyyaml facexlib ffmpeg-python opencv-python-headless numpy flask waitress \
 && sed -i 's/from torchvision.transforms.functional_tensor import rgb_to_grayscale/from torchvision.transforms.functional import rgb_to_grayscale/' "$(python -c 'import basicsr,os;print(os.path.dirname(basicsr.__file__))')/data/degradations.py" \
 && echo "__version__ = '0.3.0'" > /app/Real-ESRGAN/realesrgan/version.py
RUN mkdir -p /app/Real-ESRGAN/weights && cd /app/Real-ESRGAN/weights \
 && python - <<'PY'
import urllib.request
for n in ('realesr-general-x4v3.pth','realesr-general-wdn-x4v3.pth'):
    urllib.request.urlretrieve('https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/'+n, n)
PY
COPY server.py /app/server.py
ENV PORT=8000 DATA_DIR=/data
EXPOSE 8000
CMD ["python", "/app/server.py"]
