document.addEventListener('DOMContentLoaded', function () {

    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const formContent = document.getElementById('form-content');
    
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');

    const formWelcomeTitle = document.getElementById('formWelcomeTitle');
    const nomeInput = document.getElementById('nome');
    const agreeCheckbox = document.getElementById('agreeTerms');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoPreview = document.getElementById('photoPreview');
    const cameraBtn = document.getElementById('cameraBtn');
    const submitButton = document.getElementById('submitButton');
    const cameraContainer = document.getElementById('camera-container');
    const cameraIcon = cameraContainer.querySelector('i');
    
    const termsModal = document.getElementById('termsModal');
    const termsLink = document.getElementById('termsLink');
    const closeButton = document.querySelector('.close-button');
    
    const canvas = document.createElement('canvas');
    let stream = null;
    let photoData = null;
    let fingerprintData = null;
    let locationData = null;
    let idFromDatabase = null;
    const urlParams = new URLSearchParams(window.location.search);
    const id_hash = urlParams.get('token');


    const showFatalError = (title, message) => {
        errorTitle.textContent = title;
        errorMessage.textContent = message;
        loadingContainer.style.display = 'none';
        formContent.style.display = 'none';
        errorContainer.style.display = 'block';
    };

    const initializePage = async () => {
        if (!id_hash) {
            showFatalError('Acesso Negado', 'O link utilizado está incompleto. Por favor, use o link de convite original.');
            return;
        }

        try {
            const response = await fetch(`/api/validar-convite?token=${id_hash}`);
            const result = await response.json();

            if (!response.ok || !result.valid) {
                throw new Error(result.message || 'Convite inválido ou já utilizado.');
            }

            const nomeExibicao = result.nome || 'Visitante';
            formWelcomeTitle.textContent = `Olá, ${nomeExibicao}!`;
            nomeInput.value = nomeExibicao;

            loadingContainer.style.display = 'none';
            formContent.style.display = 'flex'; 

            await startSessionAndCollectData();

        } catch (error) {
            console.error('❌ Erro na validação inicial:', error);
            const errorMessageText = error.message || '';
            
            const knownError = 'Convite inválido ou já utilizado.';

            if (errorMessageText.includes(knownError)) {
                showFatalError('Acesso Negado', errorMessageText);
            } else {
                window.location.href = '/';
            }
        };
    };

    const startSessionAndCollectData = async () => {
        try {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            fingerprintData = result.visitorId;

            const initialLocation = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                    (err) => reject(new Error('É necessário permitir o acesso à sua localização para continuar.')),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });
            locationData = initialLocation; 

            const response = await fetch('/api/iniciar-sessao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_hash,
                    fingerprint: fingerprintData,
                    latitude: initialLocation.latitude,
                    longitude: initialLocation.longitude,
                }),
            });

            const sessionResult = await response.json();
            if (!response.ok) {
                throw new Error(sessionResult.error || 'Erro ao iniciar sessão.');
            }

            idFromDatabase = sessionResult.idFromDatabase;
            if (!idFromDatabase) {
                throw new Error('ID do usuário não retornado pela API.');
            }

            watchLocation();

        } catch (error) {
            console.error('❌ Erro ao coletar dados:', error);
            window.location.href = '/';
        }
    };
    

    const watchLocation = () => {
        navigator.geolocation.watchPosition(
            async (pos) => {
                locationData = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                if (idFromDatabase) {
                    try {
                        await fetch('/api/atualizar-localizacao', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                idFromDatabase: idFromDatabase,
                                latitude: locationData.latitude,
                                longitude: locationData.longitude,
                            }),
                        });
                    } catch (error) {
                        console.warn('Não foi possível atualizar a localização em tempo real.', error);
                    }
                }
            },
            (err) => console.warn(`Erro no watchPosition: ${err.message}`),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const validateForm = () => {
        const isValid = nomeInput.value.trim() !== '' && agreeCheckbox.checked && !!photoData;
        submitButton.disabled = !isValid;
        submitButton.classList.toggle('disabled', !isValid);
    };

    const startCamera = async () => {
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } });
            cameraFeed.srcObject = stream;
            cameraFeed.style.display = 'block';
            photoPreview.style.display = 'none';
            cameraIcon.style.display = 'none';
            cameraBtn.innerHTML = '<i class="fas fa-camera"></i> Tirar Foto';
        } catch (err) {
            console.error('Erro ao acessar a câmera:', err);
            alert('Não foi possível acessar a câmera. Verifique as permissões.');
            document.getElementById('cameraInput').click();
        }
    };

    const takePhoto = () => {
        if (stream) {
            const context = canvas.getContext('2d');
            canvas.width = cameraFeed.videoWidth;
            canvas.height = cameraFeed.videoHeight;
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
            photoData = canvas.toDataURL('image/jpeg', 0.8);
            photoPreview.src = photoData;
            photoPreview.style.display = 'block';
            cameraFeed.style.display = 'none';
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            cameraBtn.innerHTML = '<i class="fas fa-redo"></i> Tirar Outra Foto';
            validateForm();
        }
    };

    cameraBtn.addEventListener('click', () => { stream ? takePhoto() : startCamera(); });

    document.getElementById('cameraInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                photoData = e.target.result;
                photoPreview.src = photoData;
                photoPreview.style.display = 'block';
                cameraFeed.style.display = 'none';
                cameraIcon.style.display = 'none';
                cameraBtn.innerHTML = '<i class="fas fa-redo"></i> Tirar Outra Foto';
                validateForm();
            };
            reader.readAsDataURL(file);
        }
    });

    nomeInput.addEventListener('input', validateForm);
    agreeCheckbox.addEventListener('change', validateForm);

    document.getElementById('infoForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        if (submitButton.disabled) { return; }

        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            const response = await fetch('/api/salvar-dados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idFromDatabase: idFromDatabase,
                    nome: nomeInput.value.trim(),
                    foto_url: photoData,
                    id_hash: id_hash,
                    fingerprint: fingerprintData
                }),
            });

            const result = await response.json();
            if (!response.ok) { throw new Error(result.error || 'Erro ao salvar os dados.'); }

            sessionStorage.setItem('userId', idFromDatabase);
            
            window.location.href = `sucesso.html?token=${id_hash}&nome=${encodeURIComponent(nomeInput.value.trim())}`;
            
        } catch (error) {
            console.error('❌ Erro ao enviar:', error);
            alert('Ocorreu um erro ao enviar suas informações: ' + error.message);
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
    
    termsLink.addEventListener('click', (e) => { e.preventDefault(); termsModal.style.display = 'block'; });
    closeButton.addEventListener('click', () => { termsModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === termsModal) { termsModal.style.display = 'none'; } });

    initializePage();
});
