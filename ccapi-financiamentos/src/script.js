
// ✅ FUNÇÕES GLOBAIS CCAPI
// ✅ ROLAGEM AUTOMÁTICA DO INSTAGRAM
const setupInstagramAutoScroll = () => {
    console.log("Configurando rolagem automática do Instagram...");
    const instagramPosts = document.getElementById('instagramPosts');
    
    if (!instagramPosts) {
        console.warn("Elemento instagramPosts não encontrado");
        return;
    }
    
    const cards = instagramPosts.querySelectorAll('.insta-news-card');
    if (cards.length === 0) {
        console.warn("Nenhum card de Instagram encontrado");
        return;
    }
    
    let currentIndex = 0;
    const totalCards = cards.length;
    const scrollInterval = 5000; // 5 segundos entre cada rolagem
    const cardWidth = 230; // largura do card em pixels
    const gap = 14; // espaçamento entre cards
    const totalWidth = cardWidth + gap;
    
    // Função para fazer scroll automático
    const autoScroll = () => {
        currentIndex = (currentIndex + 1) % totalCards;
        const scrollPosition = currentIndex * totalWidth;
        
        instagramPosts.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    };
    
    // Iniciar o intervalo de rolagem automática
    setInterval(autoScroll, scrollInterval);
    
    // Pausar a rolagem automática quando o usuário fizer scroll manual
    let scrollTimeout;
    instagramPosts.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        // Reiniciar a rolagem automática após 10 segundos de inatividade
        scrollTimeout = setTimeout(() => {
            currentIndex = Math.round(instagramPosts.scrollLeft / totalWidth);
        }, 10000);
    });
    
    console.log("✅ Rolagem automática do Instagram configurada");
};

const setupDashboardControls = () => {
    console.log("Configurando controles do painel...");
    const menuToggle = document.getElementById('dashboardMenuToggle');
    const sidebar = document.getElementById('dashboardSidebar');
    const closeBtn = document.getElementById('dashboardClose');
    const painel = document.getElementById('painel');

    if (menuToggle && sidebar) {
        menuToggle.onclick = (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        };
    }

    if (closeBtn && painel) {
        closeBtn.onclick = () => {
            if (typeof hidePainel === 'function') hidePainel();
        };
    }

    // FECHAR SIDEBAR AO CLICAR NO CONTEÚDO (PAINEL)
    if (painel && sidebar) {
        painel.addEventListener('click', () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                console.log("✅ Sidebar fechada automaticamente ao clicar no conteúdo");
            }
        });
    }
};

const setupCEPListeners = () => {
    console.log("Configurando ouvintes de CEP...");
    const cepInputs = [
        { id: 'clientCepPF', addressId: 'clientAddressPF' },
        { id: 'pjCep', addressId: 'pjAddress' },
        { id: 'clientCepPJ', addressId: 'clientAddressPJ' },
        { id: 'clientCep', addressId: 'clientAddress' }
    ];
    
    cepInputs.forEach(inputData => {
        const input = document.getElementById(inputData.id);
        if (input) {
            input.onblur = () => {
                const cep = input.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    fetch(`https://viacep.com.br/ws/${cep}/json/`)
                        .then(r => r.json())
                        .then(data => {
                            if (!data.erro) {
                                const addr = document.getElementById(inputData.addressId);
                                if (addr) addr.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                            }
                        })
                        .catch(err => console.error("Erro ao buscar CEP:", err));
                }
            };
        }
    });
};

const fillYearSelects = () => {
    console.log("Preenchendo selects de anos...");
    const yearSelects = ['vehicleYearManufacture', 'vehicleYearModel', 'simVehicleYear', 'simVehicleModelYear'];
    yearSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Selecione</option>';
            for (let year = 2030; year >= 1990; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                select.appendChild(option);
            }
        }
    });
};

// ============================================================
// FEED DO INSTAGRAM - GERENCIADO VIA HTML
// Os cards são agora editáveis diretamente no HTML
// ============================================================
// Função removida - cards agora são estáticos no HTML

const setupHomeButtons = () => {
    console.log("Configurando botões da tela inicial...");
    
    const accessDashboardBtn = document.getElementById('accessDashboardBtn');
    if (accessDashboardBtn) {
        accessDashboardBtn.onclick = (e) => {
            if (typeof handlePainelAccess === 'function') handlePainelAccess(e);
        };
    }

    const headerProfileCircle = document.getElementById('headerProfileCircle');
    const shortcutProfileBtn = document.getElementById('shortcutProfileBtn');
    const openProfileFunc = () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) {
            if (typeof showPainel === 'function') {
                showPainel();
                setTimeout(() => { if (typeof switchTab === 'function') switchTab('profile'); }, 300);
            }
        } else {
            if (typeof openLoginModal === 'function') openLoginModal();
        }
    };
    if (headerProfileCircle) headerProfileCircle.onclick = openProfileFunc;
    if (shortcutProfileBtn) shortcutProfileBtn.onclick = openProfileFunc;

    document.querySelectorAll('.service-painel-btn').forEach(btn => {
        btn.onclick = () => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user) {
                if (typeof showPainel === 'function') showPainel();
                const section = btn.getAttribute('data-testid') === 'service-1-btn' ? 'simulation' : 'new-proposal';
                setTimeout(() => { if (typeof switchTab === 'function') switchTab(section); }, 300);
            } else {
                if (typeof openLoginModal === 'function') openLoginModal();
            }
        };
    });

    const becomePartnerBtn = document.getElementById('becomePartnerBtn');
    if (becomePartnerBtn) {
        becomePartnerBtn.onclick = () => {
            if (typeof openRegisterModal === 'function') openRegisterModal();
        };
    }

    const registerBtnSidebar = document.getElementById('registerBtnSidebar');
    const registerBtnHeader = document.getElementById('registerBtnHeader');
    if (registerBtnSidebar) registerBtnSidebar.onclick = () => { if (typeof openRegisterModal === 'function') openRegisterModal(); };
    if (registerBtnHeader) registerBtnHeader.onclick = () => { if (typeof openRegisterModal === 'function') openRegisterModal(); };

    const loginBtnSidebar = document.getElementById('loginBtnSidebar');
    if (loginBtnSidebar) loginBtnSidebar.onclick = () => { if (typeof openLoginModal === 'function') openLoginModal(); };
    
    const dashboardBtnSidebar = document.getElementById('dashboardBtnSidebar');
    if (dashboardBtnSidebar) {
        dashboardBtnSidebar.onclick = (e) => {
            if (typeof handlePainelAccess === 'function') handlePainelAccess(e);
        };
    }
};



// ==========================================
// ✅ FUNÇÕES DE FOTO DE PERFIL COM LOCALSTORAGE
// ==========================================

/**
 * Carrega a foto de perfil do localStorage
 */
function loadProfilePictureFromStorage() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || !user.id) return;

    const profilePicture = localStorage.getItem(`profile_picture_${user.id}`);
    if (profilePicture) {
        updateProfilePictureUI(profilePicture);
    }
}

/**
 * Atualiza a foto de perfil na UI (header e modal)
 */
function updateProfilePictureUI(base64Image) {
    // Atualizar o ícone do header
    const headerProfileCircle = document.getElementById("headerProfileCircle");
    if (headerProfileCircle) {
        headerProfileCircle.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = base64Image;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.alt = 'Foto de Perfil';
        
        headerProfileCircle.appendChild(img);
    }

    // Atualizar o avatar no modal de perfil
    const profileAvatarLarge = document.querySelector(".profile-avatar-large");
    if (profileAvatarLarge) {
        profileAvatarLarge.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = base64Image;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.alt = 'Foto de Perfil';
        
        profileAvatarLarge.appendChild(img);
    }
}

/**
 * Configura o upload de foto de perfil
 */
function setupProfilePictureUpload() {
    // Criar input de arquivo se não existir
    let fileInput = document.getElementById('profilePictureInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'profilePictureInput';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    // Adicionar listener ao avatar para abrir seletor de arquivo
    const profileAvatarLarge = document.querySelector(".profile-avatar-large");
    if (profileAvatarLarge) {
        profileAvatarLarge.style.cursor = 'pointer';
        profileAvatarLarge.title = 'Clique para alterar foto de perfil';
        
        profileAvatarLarge.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Handler para quando arquivo é selecionado
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            showNotification('Por favor, selecione um arquivo de imagem', 'error');
            return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Arquivo muito grande. Máximo 5MB', 'error');
            return;
        }

        // Ler arquivo como base64
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            const user = JSON.parse(localStorage.getItem("user"));

            if (!user || !user.id) {
                showNotification('Usuário não identificado', 'error');
                return;
            }

            try {
                // Salvar no localStorage
                localStorage.setItem(`profile_picture_${user.id}`, base64Image);

                // Atualizar UI imediatamente
                updateProfilePictureUI(base64Image);

                // Tentar enviar para o servidor (opcional)
                const formData = new FormData();
                formData.append('action', 'upload_profile_picture');
                formData.append('user_id', user.id);
                formData.append('profile_picture', file);

                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    showNotification('Foto de perfil atualizada com sucesso!', 'success');
                } else {
                    console.warn('Foto salva localmente, mas não foi sincronizada com o servidor');
                }

            } catch (error) {
                console.error('Erro ao atualizar foto de perfil:', error);
                showNotification('Foto atualizada localmente', 'success');
            }
        };

        reader.readAsDataURL(file);
    });
}

// ✅ ACESSO GLOBAL AO TAURI (Necessário para Android sem Bundler)
// Verificamos se o objeto existe antes de extrair as funções
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    
    setTimeout(() => {
        splash.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        splash.style.opacity = '0';
        splash.style.transform = 'scale(1.2)';
        setTimeout(() => {
            if (splash.parentNode) splash.remove();
        }, 800);
    }, 1500);
});
document.addEventListener("DOMContentLoaded", () => {

    console.log("Ccapi App Initialized");
    fillYearSelects();

    const moneyFields = ['clientIncomePF', 'clientIncomePJ', 'vehicleValue', 'financeValue', 'downPayment', 'clientIncome'];
    moneyFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.oninput = (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    value = (parseFloat(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    e.target.value = value;
                }
            };
        }
    });

    setupDashboardControls();
    setupHomeButtons();
    setupCEPListeners();
    setupInstagramAutoScroll();
    // Instagram posts agora são gerenciados via HTML - sem carregamento via JS
    if (typeof updateAllUserInfo === 'function') updateAllUserInfo();
    
    // ✅ INICIALIZAR FUNCIONALIDADES DE FOTO DE PERFIL
    setupProfilePictureUpload();
    loadProfilePictureFromStorage();

    // 🛡️ SEGURANÇA: Bloqueio de Ferramentas de Desenvolvedor e Zoom
    // Ideal para aplicações Tauri/Mobile para evitar inspeção e manter UI fixa
    
    // 1. Bloquear Clique Direito (Menu de Contexto)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    }, false);

    // 2. Bloquear Atalhos de Teclado (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+P)
    document.addEventListener('keydown', (e) => {
        // Bloquear F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspeção)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+U (Ver código fonte)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+S (Salvar página)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }

        // Bloquear Ctrl+P (Imprimir)
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            return false;
        }

        // Bloquear Zoom via Teclado (Ctrl + '+' ou '-')
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
            e.preventDefault();
            return false;
        }
    }, false);

    // 3. Bloquear Zoom via Roda do Mouse (Ctrl + Scroll)
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. Bloquear Zoom via Gestos (Pinch-to-zoom)
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    //
    // --- AJUSTE PARA TECLADO MOBILE ---
    // Garante que campos de input fiquem visíveis quando o teclado abrir
    const adjustForKeyboard = () => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };

    window.addEventListener('resize', () => {
        // No mobile, o resize geralmente indica abertura/fechamento do teclado
        if (window.innerHeight < 500) { // Teclado provavelmente aberto
            adjustForKeyboard();
        }
    });

    // Adiciona listener de foco em todos os inputs para garantir visibilidade
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Pequeno delay para esperar o teclado começar a subir no Android/iOS
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
        }
    });

    const API_URL = 'https://ccapi.com.br/api.php';

    const db = {
        async testConnection() {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'test' })
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Erro na conexão:', error);
                return { success: false, error: error.message };
            }
        },

        async registerUser(name, email, document, phone, password) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        name, email, cpf_cnpj: document, phone, password
                    })
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Erro no cadastro:', error);
                return { success: false, error: error.message };
            }
        },

        async loginUser(email, password) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', email, password })
                });
                
                // ✅ CORREÇÃO: Verificar se a resposta é válida
                if (!response.ok) {
                    return { 
                        success: false, 
                        error: `Erro HTTP: ${response.status}` 
                    };
                }
                
                // ✅ CORREÇÃO: Tentar fazer parse do JSON
                const result = await response.json();
                
                // ✅ CORREÇÃO: Retornar o resultado como está (sucesso ou erro)
                return result;
                
            } catch (error) {
                console.error('Erro no login:', error);
                return { success: false, error: error.message };
            }
        },

        async createProposal(proposalData) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'nova_proposta', ...proposalData })
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Erro ao criar proposta:', error);
                return { success: false, error: error.message };
            }
        },

        async getProposals(userId) {
            try {
                const response = await fetch(`${API_URL}?action=listar_propostas&user_id=${userId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Erro ao buscar propostas:', error);
                return { success: false, error: error.message };
            }
        },

        async getStatistics(userId) {
            try {
                const response = await fetch(`${API_URL}?action=estatisticas&user_id=${userId}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Erro ao buscar estatísticas:', error);
                return { success: false, error: error.message };
            }
        },

        async startChat(userId, proposalId) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'start_chat', user_id: userId, proposal_id: proposalId })
                });
                return await response.json();
            } catch (error) {
                console.error('Erro ao iniciar chat:', error);
                return { success: false, error: error.message };
            }
        },

        async sendMessage(conversationId, senderId, message, senderType = 'user') {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'send_message', conversation_id: conversationId, sender_id: senderId, message, sender_type: senderType })
                });
                return await response.json();
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                return { success: false, error: error.message };
            }
        },

        async getMessages(conversationId) {
            try {
                const response = await fetch(`${API_URL}?action=get_messages&conversation_id=${conversationId}`);
                return await response.json();
            } catch (error) {
                console.error('Erro ao buscar mensagens:', error);
                return { success: false, error: error.message };
            }
        },

        async getUserChats(userId) {
            try {
                const response = await fetch(`${API_URL}?action=get_user_chats&user_id=${userId}`);
                return await response.json();
            } catch (error) {
                console.error('Erro ao buscar chats:', error);
                return { success: false, error: error.message };
            }
        },

        async duplicateProposal(proposalId, newSpecialist = '') {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'duplicate_proposal', proposal_id: proposalId, new_specialist: newSpecialist })
                });
                return await response.json();
            } catch (error) {
                console.error('Erro ao duplicar proposta:', error);
                return { success: false, error: error.message };
            }
        }
    };

    // VARIÁVEIS GLOBAIS DO CHAT E SUPORTE
    let currentConversationId = null;
    let currentProposalId = null;
    let chatPollingInterval = null;
    let lastMessageCount = 0;
    
    // VARIÁVEIS GLOBAIS DO SUPORTE
    let currentTicketId = null;
    let supportChatStartTime = null;

    // Funções de validação
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
        let remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
        remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cpf.charAt(10));
    }

    function isValidCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        if (cnpj.length !== 14) return false;
        let sum = 0, weight = 2;
        for (let i = 11; i >= 0; i--) {
            sum += parseInt(cnpj.charAt(i)) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let remainder = sum % 11;
        if (cnpj.charAt(12) !== String(remainder < 2 ? 0 : 11 - remainder)) return false;
        sum = 0; weight = 2;
        for (let i = 12; i >= 0; i--) {
            sum += parseInt(cnpj.charAt(i)) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        remainder = sum % 11;
        return cnpj.charAt(13) === String(remainder < 2 ? 0 : 11 - remainder);
    }

    function isValidDocument(document) {
        const cleanDoc = document.replace(/[^\d]/g, '');
        if (cleanDoc.length === 11) return isValidCPF(cleanDoc);
        if (cleanDoc.length === 14) return isValidCNPJ(cleanDoc);
        return false;
    }

    function isValidBirthDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12 || day < 1 || day > 31) return false;
        const birthDate = new Date(year, month - 1, day);
        if (birthDate.getDate() !== day || birthDate.getMonth() !== month - 1 || birthDate.getFullYear() !== year) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 18 && age <= 100;
    }

    function convertDateToISO(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    async function searchCEP(cep) {
        const cleanCep = cep.replace(/[^\d]/g, '');
        if (cleanCep.length !== 8) {
            showNotification('CEP inválido (deve ter 8 números)', 'error');
            return;
        }
        
        const addressField = document.getElementById('clientAddress');
        if (addressField) addressField.value = 'Buscando endereço...';
        
        // TENTATIVA 1: Busca direta via API (Mais rápido)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                fillAddressFields(data);
                return;
            }
        } catch (e) {
            console.warn("Busca direta falhou, tentando via servidor...");
        }

        // TENTATIVA 2: Busca via Servidor PHP (Fallback seguro)
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'buscar_cep', cep: cleanCep })
            });
            const result = await response.json();
            if (result.success) {
                fillAddressFields(result.data);
                return;
            }
        } catch (e) {
            console.error("Busca via servidor falhou:", e);
        }

        // Se chegar aqui, falhou em ambos
        if (addressField) addressField.value = '';
        showNotification('Erro ao buscar CEP. Tente digitar manualmente.', 'error');
    }

    function searchCEPForField(cep, addressFieldId) {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        // TENTATIVA 1: Busca direta via ViaCEP
        fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
            .then(response => response.json())
            .then(data => {
                if (!data.erro) {
                    fillAddressFieldsById(data, addressFieldId);
                    return;
                }
            })
            .catch(e => {
                console.warn("Busca direta falhou, tentando via servidor...");
                // TENTATIVA 2: Busca via Servidor PHP
                fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'buscar_cep', cep: cleanCep })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        fillAddressFieldsById(result.data, addressFieldId);
                    }
                })
                .catch(error => {
                    console.error("Busca via servidor falhou:", error);
                });
            });
    }

    function fillAddressFieldsById(data, addressFieldId) {
        const addressField = document.getElementById(addressFieldId);
        if (addressField) {
            const logradouro = data.logradouro || '';
            const bairro = data.bairro || '';
            const localidade = data.localidade || '';
            const uf = data.uf || '';
            
            let fullAddress = '';
            if (logradouro) fullAddress += logradouro;
            if (bairro) fullAddress += (fullAddress ? ', ' : '') + bairro;
            if (localidade) fullAddress += (fullAddress ? ', ' : '') + localidade;
            if (uf) fullAddress += (fullAddress ? ' - ' : '') + uf;
            
            addressField.value = fullAddress;
            showNotification('Endereço preenchido!', 'success');
        }
    }

    function fillAddressFields(data) {
        const addressField = document.getElementById('clientAddress');
        if (addressField) {
            const logradouro = data.logradouro || '';
            const bairro = data.bairro || '';
            const localidade = data.localidade || '';
            const uf = data.uf || '';
            
            let fullAddress = '';
            if (logradouro) fullAddress += logradouro;
            if (bairro) fullAddress += (fullAddress ? ', ' : '') + bairro;
            if (localidade) fullAddress += (fullAddress ? ', ' : '') + localidade;
            if (uf) fullAddress += (fullAddress ? ' - ' : '') + uf;
            
            addressField.value = fullAddress;
            addressField.focus();
            showNotification('Endereço preenchido!', 'success');
        }
    }

    // --- EXIBIÇÃO DE MENSAGENS DE STATUS ---
    function showNotification(message, type = 'info', duration = 5000) {
        const notification = document.getElementById('notification');
        if (!notification) {
            console.log(`Notificação (${type}): ${message}`);
            return;
        }
        // Notificações essenciais têm duração maior
        const isEssential = message.toLowerCase().includes('login') || message.toLowerCase().includes('proposta') || message.toLowerCase().includes('chat') || message.toLowerCase().includes('erro');
        const displayDuration = isEssential ? 8000 : duration;
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        if (notification.timeoutId) clearTimeout(notification.timeoutId);
        notification.timeoutId = setTimeout(() => notification.classList.remove('show'), displayDuration);
    }
    
    // Garantir que a função esteja disponível globalmente para outros blocos de código
    window.showNotification = showNotification;

    function showConfirmationModal(message = "Sua proposta foi enviada com sucesso!") {
        const confirmationModal = document.getElementById('confirmationModal');
        if (confirmationModal) {
            confirmationModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    // --- FIM DA EXIBIÇÃO DE MENSAGENS DE STATUS ---
    // =============================================
    // FUNÇÃO UNIVERSAL DE FORMATAÇÃO MONETÁRIA - CORRIGIDO
    // =============================================
    function applyMoneyMask(input) {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length === 0) {
                e.target.value = '';
                return;
            }
            
            // Converte para número e formata com Intl.NumberFormat
            const numberValue = parseFloat(value) / 100;
            const formatted = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(numberValue);
            
            e.target.value = formatted;
        });
    }


    function applyMasks() {
        // CAMPOS DA ABA NOVA PROPOSTA - PF
        const cpfInputsPF = document.querySelectorAll('#clientCpfPF');
        cpfInputsPF.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const cnpjInputsPF = document.querySelectorAll('#clientCnpjPF');
        cnpjInputsPF.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const phoneInputsPF = document.querySelectorAll('#clientPhonePF');
        phoneInputsPF.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const cepInputsPF = document.querySelectorAll('#clientCepPF');
        cepInputsPF.forEach(input => {
            input.addEventListener('blur', function(e) {
                if (e.target.value && e.target.value.length >= 8) {
                    searchCEPForField(e.target.value, 'clientAddressPF');
                }
            });
        });
        cepInputsPF.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const birthDateInputPF = document.getElementById('clientBirthDatePF');
        if (birthDateInputPF) {
            birthDateInputPF.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
                if (value.length >= 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
                e.target.value = value;
            });
        }
        
        // CAMPOS DA ABA NOVA PROPOSTA - PJ
        const cnpjInputsPJ = document.querySelectorAll('#clientCnpjPJ, #clientDocumentPJ');
        cnpjInputsPJ.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                } else {
                    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });
        });
        
        const phoneInputsPJ = document.querySelectorAll('#clientPhonePJ');
        phoneInputsPJ.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const cepInputsPJ = document.querySelectorAll('#clientCepPJ');
        cepInputsPJ.forEach(input => {
            input.addEventListener('blur', function(e) {
                if (e.target.value && e.target.value.length >= 8) {
                    searchCEPForField(e.target.value, 'clientAddressPJ');
                }
            });
        });
        cepInputsPJ.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            });
        });
        
        const birthDateInputPJ = document.getElementById('clientBirthDatePJ');
        if (birthDateInputPJ) {
            birthDateInputPJ.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
                if (value.length >= 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
                e.target.value = value;
            });
        }
        
        // CAMPOS DA ABA NOVA PROPOSTA - VEICULO
        const vehiclePlateInputs = document.querySelectorAll('#vehiclePlate');
        vehiclePlateInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length <= 3) {
                    e.target.value = value;
                } else if (value.length <= 7) {
                    e.target.value = value.substring(0, 3) + '-' + value.substring(3);
                } else {
                    e.target.value = value.substring(0, 3) + '-' + value.substring(3, 7) + value.substring(7, 9);
                }
            });
        });
        
        const documentInputs = document.querySelectorAll('#registerDocument, #clientDocument');
        documentInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d)/, '$1.$2');
                    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                } else {
                    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                    value = value.replace(/(\d{4})(\d)/, '$1-$2');
                }
                e.target.value = value;
            });
        });

        const phoneInputs = document.querySelectorAll('#registerPhone, #clientPhone');
        phoneInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            });
        });

        const cepInputs = document.querySelectorAll('#clientCep');
        cepInputs.forEach(input => {
            input.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                value = value.replace(/^(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            });
        });

        const birthDateInput = document.getElementById('clientBirthDate');
        if (birthDateInput) {
            birthDateInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
                if (value.length >= 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
                e.target.value = value;
            });
            birthDateInput.addEventListener('blur', function(e) {
                if (e.target.value && !isValidBirthDate(e.target.value)) {
                    showNotification('Data de nascimento inválida (idade deve ser entre 18 e 100 anos)', 'error');
                    e.target.value = '';
                }
            });
        }

        // ✅ APLICAR MÁSCARA MONETÁRIA UNIVERSAL EM TODOS OS CAMPOS
        const moneyInputs = document.querySelectorAll('#clientIncome, #vehicleValue, #financeValue, #downPayment, #monthlyIncomeInput, #installmentValueInput, #tlFinanceValue, #tlCustomValueInput, #simVehicleValue, #simDownPayment, #monthlyIncome, #installmentValue');
        moneyInputs.forEach(input => applyMoneyMask(input));
    }

    function populateYearSelects() {    const vehicleYearManufacture = document.getElementById('vehicleYearManufacture');
    const vehicleYearModel = document.getElementById('vehicleYearModel');
    
    // Validação de anos (1990 a 2030)
    const validateYear = (input) => {
        if (!input) return;
        input.addEventListener('change', () => {
            const year = parseInt(input.value);
            if (isNaN(year) || year < 1990 || year > 2030) {
                showNotification("O ano deve estar entre 1990 e 2030", "warning");
                input.value = "";
            }
        });
        // Máscara simples para 4 dígitos
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
        });
    };
    validateYear(vehicleYearManufacture);
    validateYear(vehicleYearModel);        const currentYear = new Date().getFullYear(); // 2026

        if (manufactureSelect) {
            manufactureSelect.innerHTML = '<option value="">Selecione</option>';
            // Ano atual + 1 (ex: 2027) até 1990
            for (let year = currentYear + 1; year >= 1990; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                manufactureSelect.appendChild(option);
            }
        }

        if (modelSelect) {
            modelSelect.innerHTML = '<option value="">Selecione</option>';
            // Ano atual + 1 (ex: 2027) até 1990
            for (let year = currentYear + 1; year >= 1990; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                modelSelect.appendChild(option);
            }
        }
    }

    const searchCepBtn = document.getElementById('searchCepBtn');
    if (searchCepBtn) {
        searchCepBtn.addEventListener('click', () => {
            const cepInput = document.getElementById('clientCep');
            if (cepInput && cepInput.value) {
                searchCEP(cepInput.value);
            } else {
                showNotification('Digite um CEP válido', 'warning');
            }
        });
    }

    // Menu Mobile e Sidebar principal
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            sidebarOverlay.classList.toggle("active");
            document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
        });
        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            sidebarOverlay.classList.remove("active");
            document.body.style.overflow = "";
        });
        document.querySelectorAll(".sidebar-item").forEach(item => {
            item.addEventListener("click", () => {
                sidebar.classList.remove("active");
                sidebarOverlay.classList.remove("active");
                document.body.style.overflow = "";
            });
        });
    }

    // Menu Mobile Painel
    const painelMenuToggle = document.getElementById("painelMenuToggle");
    const painelSidebar = document.getElementById("painelSidebar");
    const painelSidebarOverlay = document.getElementById("painelSidebarOverlay");

    if (painelMenuToggle && painelSidebar && painelSidebarOverlay) {
        console.log("Menu painel inicializado");

        painelMenuToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Botão menu clicado!");

            const isActive = painelSidebar.classList.contains("active");

            if (isActive) {
                painelSidebar.classList.remove("active");
                painelSidebarOverlay.classList.remove("active");
                document.body.style.overflow = "";
            } else {
                painelSidebar.classList.add("active");
                painelSidebarOverlay.classList.add("active");
                document.body.style.overflow = "hidden";
            }

            console.log("Menu agora está:", painelSidebar.classList.contains("active") ? "ABERTO" : "FECHADO");
        });

        painelSidebarOverlay.addEventListener("click", (e) => {
            e.preventDefault();
            console.log("Overlay clicado - fechando menu");
            painelSidebar.classList.remove("active");
            painelSidebarOverlay.classList.remove("active");
            document.body.style.overflow = "";
        });

        document.querySelectorAll(".menu-item").forEach(item => {
            item.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    console.log("Item do menu clicado - fechando sidebar");
                    painelSidebar.classList.remove("active");
                    painelSidebarOverlay.classList.remove("active");
                    document.body.style.overflow = "";
                }
            });
        });
    } else {
        console.error("Elementos do menu painel não encontrados!");
        console.log("Toggle:", painelMenuToggle);
        console.log("Sidebar:", painelSidebar);
        console.log("Overlay:", painelSidebarOverlay);
    }

    // Modais
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");
    const confirmationModal = document.getElementById("confirmationModal");

    function openLoginModal() {
        if (loginModal) {
            loginModal.classList.add("active");
            if (registerModal) registerModal.classList.remove("active");
            document.body.style.overflow = "hidden";
        }
    }

    function openRegisterModal() {
        if (registerModal) {
            registerModal.classList.add("active");
            if (loginModal) loginModal.classList.remove("active");
            document.body.style.overflow = "hidden";
        }
    }

    function closeModals() {
        if (loginModal) loginModal.classList.remove("active");
        if (registerModal) registerModal.classList.remove("active");
        if (confirmationModal) confirmationModal.classList.remove("active");
        document.body.style.overflow = "";
    }

    ['loginBtnSidebar', 'loginBtnHeader'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openLoginModal(); });
    });

    ['registerBtnSidebar', 'registerBtnHeader', 'becomePartnerBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openRegisterModal(); });
    });

    const footerLoginBtn = document.getElementById('footerLoginBtn');
    if (footerLoginBtn) footerLoginBtn.addEventListener("click", (e) => { e.preventDefault(); openLoginModal(); });

    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) switchToRegister.addEventListener("click", (e) => { e.preventDefault(); openRegisterModal(); });

    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) switchToLogin.addEventListener("click", (e) => { e.preventDefault(); openLoginModal(); });

    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModals));

    window.addEventListener("click", (e) => {
        if (e.target === loginModal || e.target === registerModal || e.target === confirmationModal) closeModals();
    });

    // Painel
    const painel = document.getElementById("painel");
    const painelClose = document.getElementById("painelClose");
    const painelBtnSidebar = document.getElementById("painelBtnSidebar");
    const accessPainelBtn = document.getElementById("accessPainelBtn");

    function showPainel(fromPopState = false) {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) {
            const painelEl = document.getElementById("painel");
            if (!painelEl) return;
            
            painelEl.style.display = "flex";
            painelEl.classList.add("active");
            document.body.style.overflow = "hidden";
            document.getElementById("userName").textContent = user.name || "Parceiro";

            if (painelMenuToggle) {
                painelMenuToggle.style.display = "flex";
            }

            loadPainelData(user.id);
            loadUserChats(user.id);
            if (typeof loadSupportHistory === 'function') loadSupportHistory(user.id);

            // 🔔 NOVO: Iniciar sistema de notificações
            initializeNotificationSystem(user.id);

            showNotification("Painel carregado!", "success");

            // Gerenciamento de histórico para Mobile/Tauri
            if (!fromPopState && window.history && window.history.pushState) {
                window.history.pushState({ section: 'painel', tab: 'overview' }, 'Painel', '#painel');
            }

            // 🎓 TUTORIAL: Verificar se é o primeiro acesso e mostrar tutorial
            setTimeout(() => {
                if (window.tutorialSystem && window.tutorialSystem.isFirstAccess()) {
                    window.tutorialSystem.showWelcomeModal();
                }
            }, 1000);
        } else {
            openLoginModal();
        }
    }

    
function hidePainel(fromPopState = false) {
    console.log("Fechando painel...");
    const painel = document.getElementById("painel");
    if (!painel) return;
    
    painel.style.display = "none";
    painel.classList.remove("active");
    document.body.style.overflow = "";

    const painelMenuToggle = document.getElementById("dashboardMenuToggle");
    if (painelMenuToggle) painelMenuToggle.style.display = "none";

    const painelSidebar = document.getElementById("dashboardSidebar");
    if (painelSidebar) painelSidebar.classList.remove("active");

    if (window.chatPollingInterval) {
        clearInterval(window.chatPollingInterval);
        window.chatPollingInterval = null;
    }

    if (!fromPopState && window.history.state && window.history.state.section === 'painel') {
        window.history.pushState({ section: 'home' }, 'Home', '#home');
    }
}
window.hidePainel = hidePainel;


    // Função unificada para abrir painel ou login
    window.handlePainelAccess = (e) => {
        if (e) e.preventDefault();
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) {
            showPainel();
        } else {
            // Se não logado, abre login e marca que deve ir para o painel após logar
            localStorage.setItem("redirectAfterLogin", "painel");
            if (typeof openLoginModal === 'function') {
                openLoginModal();
            }
        }
    };
    const handlePainelAccess = window.handlePainelAccess;

    if (painelBtnSidebar) painelBtnSidebar.addEventListener("click", handlePainelAccess);
    if (accessPainelBtn) accessPainelBtn.addEventListener("click", handlePainelAccess);
    if (painelClose) painelClose.addEventListener("click", () => hidePainel(false));

    // Manipulador do botão Voltar do sistema (Android/iOS/Tauri)
    window.addEventListener('popstate', (event) => {
        const state = event.state;
        
        // Se houver modais abertos, fecha eles primeiro
        if (typeof closeModals === 'function') {
            closeModals();
        }

        if (state && state.section === 'painel') {
            // Se o painel não estiver visível, mostra ele
            if (painel && painel.style.display !== "flex") {
                showPainel(true);
            }
            // Se houver uma aba específica no estado, muda para ela
            if (state.tab) {
                switchTab(state.tab);
            }
        } else {
            // Se não houver estado de painel, esconde ele
            if (painel && painel.style.display === "flex") {
                hidePainel(true);
            }
        }
    });

    // Adiciona estado ao histórico ao abrir modais (Redefinindo as funções para que os listeners usem as novas)
    const oldOpenLoginModal = openLoginModal;
    window.openLoginModal = function() {
        if (window.history && window.history.pushState) {
            window.history.pushState({ section: 'login' }, 'Login', '#login');
        }
        if (loginModal) {
            showNotification('Faça login para acessar todas as funcionalidades', 'warning');
            loginModal.classList.add("active");
            if (registerModal) registerModal.classList.remove("active");
            document.body.style.overflow = "hidden";
        }
    };
    openLoginModal = window.openLoginModal;

    const oldOpenRegisterModal = openRegisterModal;
    window.openRegisterModal = function() {
        if (window.history && window.history.pushState) {
            window.history.pushState({ section: 'register' }, 'Cadastro', '#register');
        }
        if (registerModal) {
            registerModal.classList.add("active");
            if (loginModal) loginModal.classList.remove("active");
            document.body.style.overflow = "hidden";
        }
    };
    openRegisterModal = window.openRegisterModal;

    // Navegação painel - CORREÇÃO: Carregar chats quando clicar na aba
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const sectionId = item.getAttribute('data-section');
            
            // Gerenciamento de histórico para Mobile/Tauri
            if (window.history && window.history.pushState) {
                window.history.pushState({ section: 'painel', tab: sectionId }, 'Painel', `#painel/${sectionId}`);
            }
            
            switchTab(sectionId);
        });
    });

    function switchTab(sectionId) {
        document.querySelectorAll('.menu-item').forEach(i => {
            if (i.getAttribute('data-section') === sectionId) {
                i.classList.add('active');
            } else {
                i.classList.remove('active');
            }
        });
        
        document.querySelectorAll('.painel-section').forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        // CORREÇÃO: Carregar lista de chats quando acessar a seção de chats
        if (sectionId === 'chats') {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.id) {
                console.log("Carregando chats do usuário...");
                loadUserChats(user.id);
            }
        }
        
        // CORREÇÃO: Garantir que o suporte esteja pronto quando a aba for ativada
        if (sectionId === 'support') {
            console.log("✅ Aba de suporte ativada");
            console.log("📋 Support Form:", supportForm);
            console.log("📨 Support Messages:", supportMessages);
            console.log("⌨️ Support Input:", supportInput);
        }
    }

    // Login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            if (!email || !password || !isValidEmail(email)) {
                showNotification("Preencha os campos corretamente", "error");
                return;
            }
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';
            try {
                const res = await db.loginUser(email, password);
                if (res && res.success === true && res.data && res.data.user) {
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    
                    // ✅ CARREGAR FOTO DE PERFIL APÓS LOGIN
                    loadProfilePictureFromStorage();
                    
                    // Atualiza informações instantaneamente ANTES de fechar o modal
                    setTimeout(() => {
                        updateAllUserInfo();
                    }, 50);
                    
                    // Fechar modal
                    closeModals();
                    
                    // Mostrar mensagem de sucesso
                    showNotification("Login realizado com sucesso!", "success");
                    
                    // Verifica se deve redirecionar para o painel
                    const redirect = localStorage.getItem("redirectAfterLogin");
                    if (redirect === "painel") {
                        localStorage.removeItem("redirectAfterLogin");
                        setTimeout(() => showPainel(), 300);
                    } else if (typeof showSection === 'function') {
                        setTimeout(() => showSection('home'), 300);
                    }
                } else {
                    // Erro no login - mostrar mensagem de erro
                    const errorMsg = res && res.error ? res.error : "Erro ao fazer login. Tente novamente.";
                    showNotification(errorMsg, "error");
                }
            } catch (err) {
                console.error('Erro na requisição de login:', err);
                showNotification("Erro de conexão. Verifique sua internet.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            }
        });
    }

    // Cadastro
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("registerName").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const documentValue = document.getElementById("registerDocument").value.trim();
            const phone = document.getElementById("registerPhone").value.trim();
            const password = document.getElementById("registerPassword").value;
            const errors = [];
            if (!name || name.length < 2) errors.push("Nome inválido");
            if (!isValidEmail(email)) errors.push("Email inválido");
            if (!isValidDocument(documentValue)) errors.push("CPF/CNPJ inválido");
            if (!phone || phone.length < 10) errors.push("Telefone inválido");
            if (!password || password.length < 6) errors.push("Senha deve ter 6+ caracteres");
            if (errors.length > 0) {
                showNotification(errors.join(", "), "error");
                return;
            }
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';
            try {
                const res = await db.registerUser(name, email, documentValue, phone, password);
                if (res.success && res.data && res.data.user) {
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                    // ✅ CARREGAR FOTO DE PERFIL APÓS CADASTRO
                    loadProfilePictureFromStorage();
                    showNotification("Cadastro realizado!", "success");
                    closeModals();
                    setTimeout(showPainel, 1500);
                } else {
                    showNotification(res.error || "Erro no cadastro", "error");
                }
            } catch (err) {
                showNotification("Erro de conexão", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Criar Conta';
            }
        });
    }

    // Função para upload de documentos
    async function uploadDocument(proposalId, clientName, docType, file) {
        const formData = new FormData();
        formData.append('action', 'upload_documento');
        formData.append('proposal_id', proposalId);
        formData.append('client_name', clientName);
        formData.append('document_type', docType);
        formData.append('file', file);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Erro no upload');
            }
            
            return result;
        } catch (error) {
            console.error(`Erro no upload do documento ${docType}:`, error);
            throw error;
        }
    }

    // Event listeners para preview de arquivos
    const fileInputs = [
        { id: 'cnhFrenteFile', preview: 'cnhFrentePreview', label: 'CNH Frente' },
        { id: 'cnhVersoFile', preview: 'cnhVersoPreview', label: 'CNH Verso' },
        { id: 'comprovanteResidenciaFile', preview: 'comprovanteEnderecoPreview', label: 'Comprovante Endereco' },
        { id: 'rgFrenteFile', preview: 'rgFrentePreview', label: 'RG Frente' },
        { id: 'rgVersoFile', preview: 'rgVersoPreview', label: 'RG Verso' },
        { id: 'comprovanteBancoFile', preview: 'comprovanteBancoPreview', label: 'Extrato Bancario' },
        { id: 'comprovantePJFile', preview: 'comprovantePJPreview', label: 'Comprovante PJ' },
        { id: 'extratoBancarioFile', preview: 'extratoBancarioPreview', label: 'Extrato Bancario' },
        { id: 'comprovanteEnderecoFilePJ', preview: 'comprovanteEnderecoPreviewPJ', label: 'Comprovante Endereco PJ' },
        { id: 'contratoSocialFile', preview: 'contratoSocialPreview', label: 'Contrato Social' },
        { id: 'cnpjFile', preview: 'cnpjPreview', label: 'CNPJ' }
    ];

    fileInputs.forEach(({ id, preview, label }) => {
        const input = document.getElementById(id);
        const previewElement = document.getElementById(preview);
        
        if (input && previewElement) {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const fileSize = (file.size / 1024 / 1024).toFixed(2);
                    previewElement.textContent = `✓ ${file.name} (${fileSize} MB)`;
                    previewElement.style.color = 'green';
                } else {
                    previewElement.textContent = '';
                }
            });
        }
    });
    // Função para coletar dados da proposta
    const getProposalFormData = () => {
        const user = JSON.parse(localStorage.getItem("user"));
        const clientType = document.getElementById("clientType").value;
        const data = {
            user_id: user?.id,
            client_type: clientType,
            vehicle_type: document.getElementById("vehicleType").value,
            vehicle_brand: document.getElementById("vehicleBrand").value.trim(),
            vehicle_model: document.getElementById("vehicleModel").value.trim(),
            vehicle_year_manufacture: parseInt(document.getElementById("vehicleYearManufacture").value) || 0,
            vehicle_year_model: parseInt(document.getElementById("vehicleYearModel").value) || 0,
            vehicle_plate: document.getElementById("vehiclePlate").value.trim(),
            vehicle_value: parseFloat((document.getElementById("vehicleValue").value || "0").replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            vehicle_condition: document.getElementById("vehicleCondition").value,
            finance_value: parseFloat((document.getElementById("financeValue").value || "0").replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            down_payment: parseFloat((document.getElementById("downPayment").value || "0").replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            product_type: document.getElementById("financeType").value,
            specialist: document.getElementById("specialist").value,
            notes: document.getElementById("proposalNotes") ? document.getElementById("proposalNotes").value.trim() : null
        };

        if (clientType === 'PF') {
            data.client_name = document.getElementById("clientNamePF").value.trim();
            data.client_document = document.getElementById("clientCpfPF").value.trim();
            data.client_birth_date = document.getElementById("clientBirthDatePF").value.trim();
            data.client_phone = document.getElementById("clientPhonePF").value.trim();
            data.client_email = document.getElementById("clientEmailPF").value.trim();
            data.client_profession = document.getElementById("clientProfessionPF").value.trim();
            data.client_income = parseFloat((document.getElementById("clientIncomePF").value || "0").replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            data.has_cnh = document.getElementById("clientCnhPF").value.trim();
            data.client_cep = document.getElementById("clientCepPF").value.trim();
            data.client_address = document.getElementById("clientAddressPF").value.trim();
            data.mother_name = document.getElementById("motherNamePF").value.trim();
            data.father_name = document.getElementById("fatherNamePF").value.trim();
            data.client_naturality = document.getElementById("clientNaturalityPF").value.trim();
            data.client_rg = document.getElementById("clientRgPF").value.trim();
            data.client_rg_uf = document.getElementById("clientRgUfPF").value.trim();
            data.client_cnpj_opcional = document.getElementById("clientCnpjPF").value.trim();
            data.reference_contact = document.getElementById("clientReferencePF").value.trim();
        } else {
            data.client_name = document.getElementById("clientNamePJ").value.trim();
            data.client_document = document.getElementById("clientCnpjPJ").value.trim();
            data.client_birth_date = document.getElementById("clientBirthDatePJ").value.trim();
            data.client_phone = document.getElementById("clientPhonePJ").value.trim();
            data.client_email = document.getElementById("clientEmailPJ").value.trim();
            data.client_profession = document.getElementById("clientProfessionPJ").value.trim();
            data.client_income = parseFloat((document.getElementById("clientIncomePJ").value || "0").replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            data.has_cnh = document.getElementById("clientCnhPJ").value.trim();
            data.client_cep = document.getElementById("clientCepPJ").value.trim();
            data.client_address = document.getElementById("clientAddressPJ").value.trim();
            data.reference_contact = document.getElementById("clientReferencePJ").value.trim();
            data.client_secondary_document = document.getElementById("clientDocumentPJ").value.trim();
            
            const socios = [];
            document.querySelectorAll('.socio-item').forEach(item => {
                const name = item.querySelector('[name="socio_name[]"]')?.value;
                if (name) {
                    socios.push({
                        name: name,
                        email: item.querySelector('[name="socio_email[]"]')?.value,
                        phone: item.querySelector('[name="socio_phone[]"]')?.value,
                        cpf: item.querySelector('[name="socio_cpf[]"]')?.value,
                        profession: item.querySelector('[name="socio_profession[]"]')?.value,
                        income: item.querySelector('[name="socio_income[]"]')?.value
                    });
                }
            });
            data.socios = socios;
        }
        return data;
    };

    // Salvar Rascunho
    const saveDraftBtn = document.querySelector('button.btn-outline[type="button"]');
    if (saveDraftBtn && saveDraftBtn.textContent.includes("Salvar Rascunho")) {
        saveDraftBtn.addEventListener('click', () => {
            const draftData = getProposalFormData();
            localStorage.setItem("proposal_draft", JSON.stringify(draftData));
            showNotification("Rascunho salvo com sucesso!", "success");
        });
    }

    // Formulário de proposta
    const proposalForm = document.getElementById("proposalForm");
    if (proposalForm) {
        proposalForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user || !user.id) {
                showNotification("Faça login para criar uma proposta", "error");
                openLoginModal();
                return;
            }

            const proposalData = getProposalFormData();

            if (clientType === 'PF' && !isValidBirthDate(proposalData.client_birth_date)) {
                showNotification("Data de nascimento inválida", "error");
                return;
            }

            const documentFiles = {
                cnh_frente: document.getElementById("cnhFrenteFile")?.files[0],
                cnh_verso: document.getElementById("cnhVersoFile")?.files[0],
                comprovante_endereco: document.getElementById("comprovanteResidenciaFile")?.files[0],
                rg_frente: document.getElementById("rgFrenteFile")?.files[0],
                rg_verso: document.getElementById("rgVersoFile")?.files[0],
                comprovante_banco: document.getElementById("comprovanteBancoFile")?.files[0],
                comprovante_pj: document.getElementById("comprovantePJFile")?.files[0],
                extrato_bancario: document.getElementById("extratoBancarioFile")?.files[0],
                comprovante_endereco_pj: document.getElementById("comprovanteEnderecoFilePJ")?.files[0],
                contrato_social: document.getElementById("contratoSocialFile")?.files[0],
                cnpj: document.getElementById("cnpjFile")?.files[0]
            };

            const requiredFields = ['client_name', 'client_document', 'client_phone', 'client_email', 'vehicle_type', 'specialist'];
            const fieldLabels = {
                'client_name': 'Nome do Cliente',
                'client_document': 'CPF/CNPJ',
                'client_phone': 'Telefone',
                'client_email': 'Email',
                'vehicle_type': 'Tipo de Veículo',
                'specialist': 'Especialista Responsável'
            };
            const missing = requiredFields.filter(f => !proposalData[f]);
            if (missing.length > 0) {
                const missingLabels = missing.map(f => fieldLabels[f] || f).join(', ');
                showNotification(`Os seguintes campos não foram preenchidos: ${missingLabels}`, "error");
                return;
            }

            if (!isValidEmail(proposalData.client_email)) {
                showNotification("Email do cliente inválido", "error");
                return;
            }

            const submitBtn = proposalForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                const editingId = proposalForm.dataset.editingId;
                let res;
                
                if (editingId) {
                    // Atualizar proposta existente
                    res = await fetch(API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'editar_proposta', proposal_id: editingId, ...proposalData })
                    }).then(r => r.json());
                } else {
                    // Criar nova proposta
                    res = await db.createProposal(proposalData);
                }

                if (res.success) {
                    const proposalId = editingId || res.data.proposal_id;
                    
                    // Agora fazer upload dos documentos
                    submitBtn.textContent = 'Enviando documentos...';
                    let uploadErrors = [];
                   for (const [docType, file] of Object.entries(documentFiles)) {
                        if (file) {  // <-- ADICIONAR ESTA LINHA
                            try {
                                await uploadDocument(proposalId, proposalData.client_name, docType, file);
                            } catch (error) {
                                uploadErrors.push(`${docType}: ${error.message}`);
                            }
                        }  // <-- ADICIONAR ESTA LINHA
                    }

                    if (uploadErrors.length > 0) {
                        showNotification(`Proposta criada, mas alguns documentos falharam: ${uploadErrors.join(', ')}`, "warning");
                    } else {
                        showConfirmationModal();
                    }
                    
                    showNotification(editingId ? "Proposta atualizada com sucesso!" : "Proposta enviada com sucesso!", "success");
                    proposalForm.reset();
                    delete proposalForm.dataset.editingId;
                    submitBtn.textContent = "Enviar Proposta";
                    // Limpar previews
                    document.querySelectorAll('.file-preview').forEach(el => el.textContent = '');
                    loadPainelData(user.id);
                    loadUserChats(user.id);
                    setTimeout(() => {
                        document.querySelector('.menu-item[data-section="overview"]')?.click();
                    }, 2000);
                } else {
                    showNotification(res.error || "Erro ao enviar proposta", "error");
                }
            } catch (err) {
                console.error("Erro detalhado:", err);
                showNotification("Erro de conexão: " + (err.message || "Tente novamente"), "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Proposta';
            }
        });
    }

    async function loadPainelData(userId) {
        // Tenta carregar do cache primeiro (localStorage)
        const cachedProposals = localStorage.getItem(`proposals_${userId}`);
        const cachedStats = localStorage.getItem(`stats_${userId}`);
        
        if (cachedProposals) {
            const proposals = JSON.parse(cachedProposals);
            updateRecentProposals(proposals.slice(0, 5));
            updateProposalsTable(proposals);
        }
        
        if (cachedStats) {
            const stats = JSON.parse(cachedStats);
            document.getElementById('totalProposals').textContent = stats.total || 0;
            document.getElementById('approvedProposals').textContent = stats.aprovadas || 0;
            document.getElementById('pendingProposals').textContent = stats.pendentes || 0;
        }

        try {
            const proposalsRes = await db.getProposals(userId);
            const statsRes = await db.getStatistics(userId);
            
            if (proposalsRes.success && proposalsRes.data) {
                const proposals = proposalsRes.data.proposals || [];
                updateRecentProposals(proposals.slice(0, 5));
                updateProposalsTable(proposals);
                // Salva no cache
                localStorage.setItem(`proposals_${userId}`, JSON.stringify(proposals));
            }
            
            if (statsRes.success && statsRes.data) {
                document.getElementById('totalProposals').textContent = statsRes.data.total || 0;
                document.getElementById('approvedProposals').textContent = statsRes.data.aprovadas || 0;
                document.getElementById('pendingProposals').textContent = statsRes.data.pendentes || 0;
                // Salva no cache
                localStorage.setItem(`stats_${userId}`, JSON.stringify(statsRes.data));
            }

            // Carregar tickets de suporte
            const supportRes = await fetch(`${API_URL}?action=get_tickets&user_id=${userId}`).then(r => r.json());
            if (supportRes.success) {
                renderSupportTickets(supportRes.data);
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            if (!navigator.onLine) {
                showNotification("Sem conexão com o servidor. Exibindo dados salvos offline.", "warning");
            }
        }
    }

    function renderSupportTickets(tickets) {
        const container = document.getElementById('supportTicketsList');
        if (!container) return;
        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">Nenhum ticket de suporte aberto.</p>';
            return;
        }
        container.innerHTML = tickets.map(t => `
            <div class="ticket-card" style="background: var(--card-bg); border: 1px solid var(--gray-200); border-radius: 12px; padding: 15px; margin-bottom: 10px; box-shadow: var(--shadow-sm);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="margin: 0; font-size: 16px; color: var(--text-dark);">#${t.id} - ${t.subject}</h4>
                    <span class="badge badge-${t.status === 'open' ? 'warning' : 'success'}" style="padding: 4px 8px; border-radius: 4px; font-size: 12px;">${t.status === 'open' ? 'Aberto' : 'Fechado'}</span>
                </div>
                <p style="margin: 0; font-size: 14px; color: var(--text-light);">${t.message}</p>
                <div style="margin-top: 10px; font-size: 12px; color: var(--gray-500);">${new Date(t.created_at).toLocaleString('pt-BR')}</div>
            </div>
        `).join('');
    }

    function updateRecentProposals(proposals) {
        const container = document.getElementById('recentProposalsList');
        const editWarningBox = document.getElementById('editWarningBox');
        if (!container) return;
        
        // Verificar se ha propostas dentro do prazo de 3 dias
        let hasRecentProposal = false;
        if (proposals.length > 0) {
            const now = new Date();
            for (let p of proposals) {
                const createdDate = new Date(p.created_at);
                const diffTime = Math.abs(now - createdDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 3) {
                    hasRecentProposal = true;
                    break;
                }
            }
        }
        
        // Mostrar ou ocultar aviso de edicao
        if (editWarningBox) {
            editWarningBox.style.display = hasRecentProposal ? 'flex' : 'none';
        }
        
        if (proposals.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma proposta encontrada.</p>';
            return;
        }
        container.innerHTML = proposals.map(p => `
            <div class="proposal-item" style="background: var(--gray-50); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer;" onclick="showProposalDetailsModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <div>
                        <strong>${p.client_name}</strong>
                        <p style="margin: 0; color: var(--text-light); font-size: 0.9rem;">${p.vehicle_brand} ${p.vehicle_model} - R$ ${parseFloat(p.finance_value).toLocaleString('pt-BR')}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="status-badge status-${p.status}">${getStatusText(p.status)}</span>
                        <p style="margin: 0; font-size: 0.8rem;">${new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                <div style="padding: 10px; background: rgba(0,0,0,0.02); border-radius: 6px; font-size: 0.85rem; color: #555; line-height: 1.4;">
                    ${getStatusMessage(p.status)}
                </div>
            </div>
        `).join('');
    }

    function updateProposalsTable(proposals) {
        const tbody = document.getElementById('proposalsTableBody');
        if (!tbody) return;
        if (proposals.length === 0) {
            tbody.innerHTML = '<tr class="no-proposals"><td colspan="9">Nenhuma proposta encontrada.</td></tr>';
            return;
        }
        tbody.innerHTML = proposals.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.client_name}</td>
                <td>${p.client_document}</td>
                <td>${p.vehicle_brand} ${p.vehicle_model}</td>
                <td>R$ ${parseFloat(p.finance_value).toLocaleString('pt-BR')}</td>
                <td>${p.specialist}</td>
                <td>
                    <span class="status-badge status-${p.status}" title="${getStatusMessage(p.status).replace(/\n/g, ' ')}" style="cursor: help;">
                        ${getStatusText(p.status)}
                    </span>
                </td>
                <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-outline btn-sm btn-view-proposal" data-proposal-id="${p.id}" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-primary btn-sm btn-chat-proposal" data-proposal-id="${p.id}" title="Abrir chat">
                            <i class="fas fa-comments"></i>
                        </button>
                        ${(() => {
                            const createdDate = new Date(p.created_at);
                            const now = new Date();
                            const diffTime = Math.abs(now - createdDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays <= 3) {
                                return `
                                    <button class="btn btn-secondary btn-sm btn-edit-proposal" data-proposal-id="${p.id}" title="Editar proposta (Disponível por 3 dias)">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                `;
                            }
                            return '';
                        })()}
                    </div>
                </td>
            </tr>
        `).join('');

        // Event listeners para botões
        document.querySelectorAll('.btn-view-proposal').forEach(btn => {
            btn.addEventListener('click', () => {
                const proposalId = btn.dataset.proposalId;
                const proposal = proposals.find(p => p.id == proposalId);
                if (proposal) showProposalDetailsModal(proposal);
            });
        });

        document.querySelectorAll('.btn-chat-proposal').forEach(btn => {
            btn.addEventListener('click', () => {
                const proposalId = btn.dataset.proposalId;
                startChatWithProposal(proposalId);
            });
        });

        document.querySelectorAll('.btn-edit-proposal').forEach(btn => {
            btn.addEventListener('click', () => {
                const proposalId = btn.dataset.proposalId;
                const proposal = proposals.find(p => p.id == proposalId);
                if (proposal) {
                    loadProposalIntoForm(proposal);
                }
            });
        });
    }

    function loadProposalIntoForm(p) {
        // Muda para a aba de nova proposta
        const newProposalTab = document.querySelector('[data-section="new-proposal"]');
        if (newProposalTab) newProposalTab.click();

        // Preenche os campos
        if (document.getElementById("clientName")) document.getElementById("clientName").value = p.client_name || "";
        if (document.getElementById("clientDocument")) document.getElementById("clientDocument").value = p.client_document || "";
        if (document.getElementById("clientBirthDate")) {
            const date = new Date(p.client_birth_date);
            const formattedDate = !isNaN(date) ? date.toLocaleDateString('pt-BR') : p.client_birth_date;
            document.getElementById("clientBirthDate").value = formattedDate;
        }
        if (document.getElementById("clientPhone")) document.getElementById("clientPhone").value = p.client_phone || "";
        if (document.getElementById("clientEmail")) document.getElementById("clientEmail").value = p.client_email || "";
        if (document.getElementById("clientProfession")) document.getElementById("clientProfession").value = p.client_profession || "";
        if (document.getElementById("clientIncome")) document.getElementById("clientIncome").value = parseFloat(p.client_income || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById("clientCnh")) document.getElementById("clientCnh").value = p.has_cnh || "";
        if (document.getElementById("clientCep")) document.getElementById("clientCep").value = p.client_cep || "";
        if (document.getElementById("clientAddress")) document.getElementById("clientAddress").value = p.client_address || "";
        
        // Filiação
        if (document.getElementById("motherName")) document.getElementById("motherName").value = p.mother_name || "";
        if (document.getElementById("motherCpf")) document.getElementById("motherCpf").value = p.mother_cpf || "";
        if (document.getElementById("motherBirthDate")) {
            const date = new Date(p.mother_birth_date);
            document.getElementById("motherBirthDate").value = (p.mother_birth_date && !isNaN(date)) ? date.toLocaleDateString('pt-BR') : "";
        }
        if (document.getElementById("fatherName")) document.getElementById("fatherName").value = p.father_name || "";
        if (document.getElementById("fatherCpf")) document.getElementById("fatherCpf").value = p.father_cpf || "";
        if (document.getElementById("fatherBirthDate")) {
            const date = new Date(p.father_birth_date);
            document.getElementById("fatherBirthDate").value = (p.father_birth_date && !isNaN(date)) ? date.toLocaleDateString('pt-BR') : "";
        }

        // Veículo
        if (document.getElementById("vehicleType")) document.getElementById("vehicleType").value = p.vehicle_type || "";
        if (document.getElementById("vehicleBrand")) document.getElementById("vehicleBrand").value = p.vehicle_brand || "";
        if (document.getElementById("vehicleModel")) document.getElementById("vehicleModel").value = p.vehicle_model || "";
        if (document.getElementById("vehicleYearManufacture")) document.getElementById("vehicleYearManufacture").value = p.vehicle_year_manufacture || "";
        if (document.getElementById("vehicleYearModel")) document.getElementById("vehicleYearModel").value = p.vehicle_year_model || "";
        if (document.getElementById("vehiclePlate")) document.getElementById("vehiclePlate").value = p.vehicle_plate || "";
        if (document.getElementById("vehicleValue")) document.getElementById("vehicleValue").value = parseFloat(p.vehicle_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById("vehicleCondition")) document.getElementById("vehicleCondition").value = p.vehicle_condition || "";

        // Financiamento
        if (document.getElementById("financeValue")) document.getElementById("financeValue").value = parseFloat(p.finance_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById("downPayment")) document.getElementById("downPayment").value = parseFloat(p.down_payment || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (document.getElementById("financeType")) document.getElementById("financeType").value = p.product_type || "";
        if (document.getElementById("specialist")) document.getElementById("specialist").value = p.specialist || "";
        if (document.getElementById("proposalNotes")) document.getElementById("proposalNotes").value = p.notes || "";

        // Armazena o ID da proposta sendo editada no formulário
        const form = document.getElementById("proposalForm");
        form.dataset.editingId = p.id;
        
        // Altera o texto do botão
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = "Atualizar Proposta #" + p.id;

        showNotification("Dados da proposta #" + p.id + " carregados para edição.", "info");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ✅ ATUALIZADO: Mensagens de status personalizadas
    function getStatusText(status) {
        const map = {
            'pending': 'Pendente',
            'approved': 'Aprovado',
            'rejected': 'Recusada',
            'analyzing': 'Em análise',
            'formalizada': 'Formalizada'
        };
        return map[status] || status;
    }

    // ✅ NOVO: Função para obter mensagens detalhadas de status
    function getStatusMessage(status) {
        const messages = {
            'pending': 'Hum, sua proposta ficou pendente de alguma informação, nosso especialista entrará em contato em breve!',
            'approved': 'Aprovado! Parabéns! Seu crédito foi aprovado, nosso especialista entrará em contato em breve!',
            'rejected': 'Suas informações não foram compatíveis com o seu pedido de crédito, nesse momento. Mas não se desanime! Podemos fazer uma nova tentativa após 45 dias.',
            'analyzing': 'Olá, seu crédito está sendo analisado nesse momento, pedimos que acompanhe o status nessa plataforma.',
            'formalizada': 'Deu tudo certo!\n\nAgora é só comemorar!\n\nFicamos felizes com a sua conquista e continue contando com a gente aqui, tá!?\n\nSua primeira parcela será para daqui a 30 dias! Fique atento ao seu carnê, ele deverá chegar no seu e-mail em até 15 dias. Se não chegar, nos peça aqui, ok!?\n\nQue Deus abençoe você e sua família.\n\nFamília Ccapi'
        };
        return messages[status] || 'Status da proposta atualizado.';
    }

    function showProposalDetailsModal(proposal) {
        let modal = document.getElementById('proposalDetailsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'proposalDetailsModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Detalhes da Proposta #<span id="modalProposalId"></span></h2>
                        <button class="modal-close" onclick="closeProposalDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="modalStatusMessage" style="padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid; font-size: 0.95rem;"></div>
                        <div id="modalBankInfo" style="display: none; padding: 12px; background: #f0f9ff; border: 1px solid #38bdf8; border-radius: 8px; margin-bottom: 20px;">
                            <strong style="color: #0284c7;">🏦 Banco:</strong> <span id="modalBankName"></span>
                        </div>
                        <h3>Dados do Cliente</h3>
                        <div class="info-grid">
                            <div class="info-item"><strong>Nome:</strong> <span id="modalClientName"></span></div>
                            <div class="info-item"><strong>CPF/CNPJ:</strong> <span id="modalClientDocument"></span></div>
                            <div class="info-item"><strong>Telefone:</strong> <span id="modalClientPhone"></span></div>
                            <div class="info-item"><strong>Email:</strong> <span id="modalClientEmail"></span></div>
                            <div class="info-item"><strong>Profissão:</strong> <span id="modalClientProfession"></span></div>
                            <div class="info-item"><strong>Renda:</strong> <span id="modalClientIncome"></span></div>
                        </div>
                        <h3>Dados do Veículo</h3>
                        <div class="info-grid">
                            <div class="info-item"><strong>Veículo:</strong> <span id="modalVehicle"></span></div>
                            <div class="info-item"><strong>Ano:</strong> <span id="modalVehicleYear"></span></div>
                            <div class="info-item"><strong>Valor:</strong> <span id="modalVehicleValue"></span></div>
                        </div>
                        <h3>Dados do Financiamento</h3>
                        <div class="info-grid">
                            <div class="info-item"><strong>Valor a Financiar:</strong> <span id="modalFinanceValue"></span></div>
                            <div class="info-item"><strong>Entrada:</strong> <span id="modalDownPayment"></span></div>
                            <div class="info-item"><strong>Status:</strong> <span id="modalStatus"></span></div>
                            <div class="info-item"><strong>Especialista:</strong> <span id="modalSpecialist"></span></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeProposalDetailsModal()">Fechar</button>
                        <button class="btn btn-primary" id="startChatBtn">Abrir Chat</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const statusColorMap = {
            'pending': { bg: '#fff3cd', border: '#ffc107' },
            'approved': { bg: '#d1e7dd', border: '#198754' },
            'rejected': { bg: '#f8d7da', border: '#dc3545' },
            'analyzing': { bg: '#cfe2ff', border: '#0d6efd' },
            'formalizada': { bg: '#d1f2eb', border: '#20c997' }
        };
        const colors = statusColorMap[proposal.status] || { bg: '#e9ecef', border: '#6c757d' };

        document.getElementById('modalProposalId').textContent = proposal.id;
        document.getElementById('modalClientName').textContent = proposal.client_name;
        document.getElementById('modalClientDocument').textContent = proposal.client_document;
        document.getElementById('modalClientPhone').textContent = proposal.client_phone;
        document.getElementById('modalClientEmail').textContent = proposal.client_email;
        document.getElementById('modalClientProfession').textContent = proposal.client_profession || 'N/A';
        document.getElementById('modalClientIncome').textContent = 'R$ ' + parseFloat(proposal.client_income || 0).toLocaleString('pt-BR');
        document.getElementById('modalVehicle').textContent = proposal.vehicle_brand + ' ' + proposal.vehicle_model;
        document.getElementById('modalVehicleYear').textContent = proposal.vehicle_year_manufacture + '/' + proposal.vehicle_year_model;
        document.getElementById('modalVehicleValue').textContent = 'R$ ' + parseFloat(proposal.vehicle_value || 0).toLocaleString('pt-BR');
        document.getElementById('modalFinanceValue').textContent = 'R$ ' + parseFloat(proposal.finance_value).toLocaleString('pt-BR');
        document.getElementById('modalDownPayment').textContent = 'R$ ' + parseFloat(proposal.down_payment || 0).toLocaleString('pt-BR');
        document.getElementById('modalStatus').innerHTML = '<span class="status-badge status-' + proposal.status + '">' + getStatusText(proposal.status) + '</span>';
        document.getElementById('modalSpecialist').textContent = proposal.specialist;

        // ✅ NOVO: Exibir nome do banco se o status for 'formalizada' e houver bank_name
        const bankInfoDiv = document.getElementById('modalBankInfo');
        const bankNameSpan = document.getElementById('modalBankName');

        if (proposal.status === 'formalizada' && proposal.bank_name && proposal.bank_name.trim() !== '') {
            bankInfoDiv.style.display = 'block';
            bankNameSpan.textContent = proposal.bank_name;
        } else {
            bankInfoDiv.style.display = 'none';
        }

        // ✅ NOVO: Exibir mensagem de status personalizada
        const statusMessageDiv = document.getElementById('modalStatusMessage');
        statusMessageDiv.style.background = colors.bg;
        statusMessageDiv.style.borderLeftColor = colors.border;
        statusMessageDiv.innerHTML = '<strong style="display: block; margin-bottom: 8px; font-size: 1.1em;">' + getStatusText(proposal.status) + '</strong><p style="margin: 0; white-space: pre-line; line-height: 1.6;">' + getStatusMessage(proposal.status) + '</p>';

        const startChatBtn = document.getElementById('startChatBtn');
        startChatBtn.onclick = function() {
            startChatWithProposal(proposal.id);
        };

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    window.closeProposalDetailsModal = function() {
        const modal = document.getElementById('proposalDetailsModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function startChatWithProposal(proposalId) {
        console.log("🔵 Iniciando chat para proposta:", proposalId);
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) {
            console.error("❌ Usuário não autenticado");
            showNotification("Faça login para acessar o chat", "error");
            openLoginModal();
            return;
        }

        closeProposalDetailsModal();
        
        // Abrir aba de chats
        const chatTab = document.querySelector('.menu-item[data-section="chats"]');
        if (chatTab) {
            console.log("✅ Clicando na aba de chats");
            chatTab.click();
            setTimeout(() => {
                console.log("⏳ Inicializando chat após 300ms");
                initializeChat(user.id, proposalId);
            }, 300);
        } else {
            console.error("❌ Aba de chats não encontrada no DOM");
            initializeChat(user.id, proposalId);
        }
        
        showNotification("Abrindo chat...", "info");
    }

        async function initializeChat(userId, proposalId) {
        console.log("🟢 initializeChat chamado com userId:", userId, "proposalId:", proposalId);
        try {
            const result = await db.startChat(userId, proposalId);
            console.log("📊 Resultado do startChat:", result);
            
            if (result.success) {
                currentConversationId = result.data.conversation_id;
                currentProposalId = proposalId;
                console.log("✅ Chat iniciado. Conversation ID:", currentConversationId);
                
                await loadChatMessages(currentConversationId, proposalId);
                startChatPolling();
                ensureChatInputVisible();
                showNotification("Chat iniciado com sucesso!", "success");
            } else {
                console.error("❌ Erro ao iniciar chat:", result.error);
                showNotification("Erro ao iniciar chat: " + (result.error || "Erro desconhecido"), "error");
            }
        } catch (error) {
            console.error('❌ Exceção ao iniciar chat:', error);
            showNotification("Erro ao iniciar chat: " + error.message, "error");
        }
    }

    // ✅ CORREÇÃO CRÍTICA: Função para garantir que o campo de mensagem esteja visível
    function ensureChatInputVisible() {
        const chatInputContainer = document.querySelector('.chat-input-container');
        if (chatInputContainer) {
            // Forçar display e visibility
            chatInputContainer.style.display = 'flex';
            chatInputContainer.style.visibility = 'visible';
            chatInputContainer.style.opacity = '1';
            
            // Remover qualquer classe que possa estar escondendo
            chatInputContainer.classList.remove('hidden');
            
            console.log("✅ Chat input container forçado a ficar visível");
            console.log("✅ Display:", chatInputContainer.style.display);
            console.log("✅ Visibility:", chatInputContainer.style.visibility);
        } else {
            console.warn("⚠️ Container de input do chat não encontrado!");
        }
    }

    async function loadChatMessages(conversationId, proposalId) {
        try {
            const result = await db.getMessages(conversationId);
            if (result.success) {
                const messages = result.data.messages || [];
                displayChatMessages(messages, proposalId);
                lastMessageCount = messages.length;

                // ✅ CORREÇÃO: Garantir que o input esteja visível após carregar mensagens
                setTimeout(() => {
                    ensureChatInputVisible();
                }, 100);
            } else {
                console.error('Erro ao carregar mensagens:', result.error);
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    }

    function displayChatMessages(messages, proposalId) {
        const chatMessagesContainer = document.getElementById('chatMessages');
        const chatHeader = document.getElementById('chatHeader');

        if (!chatMessagesContainer || !chatHeader) return;

        // Atualizar cabeçalho do chat
        chatHeader.innerHTML = `
            <div class="chat-info">
                <h4>Proposta #${proposalId}</h4>
                <span>Chat em tempo real</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="closeChatWindow()">Fechar</button>
        `;

        // Exibir mensagens
        if (messages.length === 0) {
            chatMessagesContainer.innerHTML = '<p class="no-data" style="text-align: center; color: var(--gray-500); padding: 40px;">Nenhuma mensagem ainda. Inicie a conversa!</p>';
        } else {
            chatMessagesContainer.innerHTML = messages.map(msg => {
                const isUser = msg.sender_type === 'user';
                const senderName = isUser ? 'Você' : (msg.sender_name || 'Administrador');
                const messageDate = new Date(msg.created_at);
                const timeStr = messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                return `
                    <div class="message message-${msg.sender_type}">
                        <div class="message-content">
                            <div class="message-text">${msg.message}</div>
                            <div class="message-info">
                                <span class="message-sender">${senderName}</span>
                                <span class="message-time">${timeStr}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Scroll para última mensagem
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // ✅ CORREÇÃO: Garantir que o input esteja visível após renderizar mensagens
        setTimeout(() => {
            ensureChatInputVisible();
        }, 150);
    }

    window.closeChatWindow = function() {
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
            chatPollingInterval = null;
        }
        currentConversationId = null;
        currentProposalId = null;

        const chatMessagesContainer = document.getElementById('chatMessages');
        const chatHeader = document.getElementById('chatHeader');
        const chatInputContainer = document.querySelector('.chat-input-container');

        if (chatMessagesContainer) {
            chatMessagesContainer.innerHTML = '<p class="no-data" style="text-align: center; color: var(--gray-500); padding: 40px;">Selecione uma conversa para iniciar</p>';
        }

        if (chatHeader) {
            chatHeader.innerHTML = '<div class="chat-info"><h4>Chat</h4><span>Selecione uma proposta</span></div>';
        }

        // Esconder o container de input quando o chat é fechado
        if (chatInputContainer) {
            chatInputContainer.style.display = 'none';
            chatInputContainer.style.visibility = 'hidden';
            console.log("✅ Chat input container escondido");
        }

        showNotification("Chat fechado", "info");
    }

    function startChatPolling() {
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
        }

        chatPollingInterval = setInterval(async () => {
            if (currentConversationId && currentProposalId) {
                try {
                    const result = await db.getMessages(currentConversationId);
                    if (result.success) {
                        const messages = result.data.messages || [];
                        if (messages.length !== lastMessageCount) {
                            displayChatMessages(messages, currentProposalId);
                            lastMessageCount = messages.length;
                        }
                    }
                } catch (error) {
                    console.error('Erro no polling:', error);
                }
            }
        }, 3000); // Atualiza a cada 3 segundos
    }

    // Event listener para enviar mensagem
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessageInput = document.getElementById('chatMessageInput');

    if (chatSendBtn && chatMessageInput) {
        chatSendBtn.addEventListener('click', sendChatMessage);
        chatMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    async function sendChatMessage() {
        const messageInput = document.getElementById('chatMessageInput');
        if (!messageInput) return;

        const message = messageInput.value.trim();
        if (!message) {
            showNotification("Digite uma mensagem", "warning");
            return;
        }

        if (!currentConversationId) {
            showNotification("Nenhum chat ativo", "error");
            return;
        }

        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) {
            showNotification("Erro: usuário não encontrado", "error");
            return;
        }

        try {
            const result = await db.sendMessage(currentConversationId, user.id, message, 'user');
            if (result.success) {
                messageInput.value = '';
                await loadChatMessages(currentConversationId, currentProposalId);

                // ✅ CORREÇÃO PRINCIPAL: Garantir que o input permaneça visível após enviar mensagem
                setTimeout(() => {
                    ensureChatInputVisible();
                    messageInput.focus();
                }, 200);
            } else {
                showNotification("Erro ao enviar mensagem: " + (result.error || "Erro desconhecido"), "error");
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            showNotification("Erro ao enviar mensagem", "error");
        }
    }

    async function loadUserChats(userId) {
        try {
            console.log("🔄 Buscando chats do usuário:", userId);
            const result = await db.getUserChats(userId);
            console.log("📦 Resultado da busca de chats:", result);

            if (result.success) {
                const chats = result.data.chats || [];
                console.log("💬 Chats encontrados:", chats.length);
                updateUserChatsList(chats);
            } else {
                console.error("❌ Erro ao buscar chats:", result.error);
                updateUserChatsList([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar chats:', error);
            updateUserChatsList([]);
        }
    }

    function updateUserChatsList(chats) {
        const container = document.getElementById('userChatsList');
        if (!container) {
            console.error("❌ Container userChatsList não encontrado!");
            return;
        }

        console.log("🎨 Atualizando lista de chats na interface:", chats.length, "chats");

        if (chats.length === 0) {
            container.innerHTML = '<p class="no-data" style="padding: 20px; text-align: center; color: var(--gray-500);">Nenhuma conversa encontrada. Crie uma proposta primeiro!</p>';
            return;
        }

        container.innerHTML = chats.map(c => `
            <div class="chat-item" data-conversation-id="${c.conversation_id}" data-proposal-id="${c.proposal_id}" style="cursor: pointer;">
                <div class="chat-info">
                    <h4>Proposta #${c.proposal_id}</h4>
                    <p>Cliente: ${c.client_name || 'N/A'}</p>
                    <p>Especialista: ${c.specialist || 'N/A'}</p>
                    <small>Última atividade: ${new Date(c.updated_at).toLocaleString('pt-BR')}</small>
                </div>
                ${c.unread_count > 0 ? `<span class="chat-unread-badge">${c.unread_count}</span>` : ''}
            </div>
        `).join('');

        // Adicionar event listeners aos itens de chat
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = parseInt(item.dataset.conversationId);
                const proposalId = parseInt(item.dataset.proposalId);
                console.log("🖱️ Chat clicado - Conversation:", conversationId, "Proposal:", proposalId);
                openChat(conversationId, proposalId);
            });
        });

        console.log("✅ Lista de chats renderizada com sucesso!");
    }

    async function openChat(conversationId, proposalId) {
        console.log("📂 Abrindo chat - Conversation:", conversationId, "Proposal:", proposalId);

        currentConversationId = conversationId;
        currentProposalId = proposalId;

        await loadChatMessages(conversationId, proposalId);
        startChatPolling();

        // ✅ CORREÇÃO: Garantir visibilidade do input ao abrir chat
        setTimeout(() => {
            ensureChatInputVisible();
        }, 300);

        showNotification("Chat carregado", "success");
    }

    // 🔔 SISTEMA DE NOTIFICAÇÕES - INTEGRAÇÃO COMPLETA

    // Callback para atualizar painel quando houver mudança de status
    window.painelUpdateCallback = function() {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.id) {
            console.log("🔄 Atualizando painel após mudança de status...");
            loadPainelData(user.id);
        }
    };

    // Função para inicializar o sistema de notificações
    async function initializeNotificationSystem(userId) {
        if (!window.notificationSystem) {
            console.error("❌ Sistema de notificações não encontrado!");
            return;
        }

        console.log("🔔 Inicializando sistema de notificações para usuário:", userId);

        // Solicitar permissão para notificações
        const hasPermission = await window.notificationSystem.requestPermission();

        if (hasPermission) {
            // Iniciar monitoramento
            window.notificationSystem.startMonitoring(userId);
            console.log("✅ Sistema de notificações iniciado com sucesso!");

            // Atualizar indicador visual
            updateNotificationBellStatus('active');
        } else {
            console.warn("⚠️ Permissão de notificação negada pelo usuário");
            updateNotificationBellStatus('denied');
        }
    }

    // Função para atualizar o status visual do sino de notificações
    function updateNotificationBellStatus(status) {
        const bellBtn = document.getElementById('notificationBellBtn');
        const statusIndicator = document.getElementById('notificationStatus');

        if (!bellBtn || !statusIndicator) return;

        // Remover classes anteriores
        bellBtn.classList.remove('notification-active', 'notification-denied', 'notification-inactive');

        switch(status) {
            case 'active':
                bellBtn.classList.add('notification-active');
                statusIndicator.style.color = '#10b981'; // Verde
                bellBtn.title = 'Notificações ativas';
                break;
            case 'denied':
                bellBtn.classList.add('notification-denied');
                statusIndicator.style.color = '#ef4444'; // Vermelho
                bellBtn.title = 'Notificações desativadas - Clique para ativar';
                break;
            case 'inactive':
            default:
                bellBtn.classList.add('notification-inactive');
                statusIndicator.style.color = '#6b7280'; // Cinza
                bellBtn.title = 'Notificações inativas';
                break;
        }
    }

    // Event listener para o botão de sino de notificações
    const notificationBellBtn = document.getElementById('notificationBellBtn');
    if (notificationBellBtn) {
        notificationBellBtn.addEventListener('click', async () => {
            if (!window.notificationSystem) return;

            const permissionStatus = window.notificationSystem.getPermissionStatus();

            if (permissionStatus === 'denied' || permissionStatus === 'default') {
                // Solicitar permissão novamente
                const hasPermission = await window.notificationSystem.requestPermission();

                if (hasPermission) {
                    const user = JSON.parse(localStorage.getItem("user"));
                    if (user && user.id) {
                        window.notificationSystem.startMonitoring(user.id);
                        updateNotificationBellStatus('active');
                        showNotification("Notificações ativadas com sucesso!", "success");
                    }
                } else {
                    showNotification("Permissão de notificação negada. Ative nas configurações do navegador.", "warning");
                    updateNotificationBellStatus('denied');
                }
            } else if (permissionStatus === 'granted') {
                // Se já está ativo, mostrar status
                if (window.notificationSystem.isActive) {
                    showNotification("Sistema de notificações está ativo e monitorando suas propostas!", "info");
                } else {
                    // Reativar se estiver inativo
                    const user = JSON.parse(localStorage.getItem("user"));
                    if (user && user.id) {
                        window.notificationSystem.startMonitoring(user.id);
                        updateNotificationBellStatus('active');
                        showNotification("Notificações reativadas!", "success");
                    }
                }
            }
        });
    }

    applyMasks();
    populateYearSelects();

    (async () => {
        const result = await db.testConnection();
        // if (result.success) showNotification("Sistema conectado!", "success");
        // else showNotification("Erro na conexão com o servidor", "error");
    })();

    console.log("✅ Sistema Ccapi com chat e notificações completo carregado!");
});

// 🔔 SISTEMA DE NOTIFICAÇÕES - Ccapi Financiamentos
// Gerencia notificações do navegador para mudanças de status

class NotificationSystem {
    constructor() {
        this.pollingInterval = null;
        this.pollingFrequency = 30000; // 30 segundos
        this.userId = null;
        this.isActive = false;
    }

    // Solicitar permissão para notificações
    async requestPermission() {
        if (!("Notification" in window)) {
            console.warn("Este navegador não suporta notificações");
            return false;
        }

        if (Notification.permission === "granted") {
            console.log("✅ Permissão de notificação já concedida");
            return true;
        }

        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                console.log("✅ Permissão de notificação concedida");
                this.showWelcomeNotification();
                return true;
            }
        }

        console.warn("❌ Permissão de notificação negada");
        return false;
    }

    // Mostrar notificação de boas-vindas
    showWelcomeNotification() {
        new Notification("Notificações Ativadas! 🔔", {
            body: "Você será notificado quando o status das suas propostas mudar.",
            icon: "IMG/Logo Ccapi-Photoroom.png",
            tag: "welcome",
            requireInteraction: false
        });
    }

    // Iniciar monitoramento de mudanças
    startMonitoring(userId) {
        this.userId = userId;
        this.isActive = true;

        console.log("🔄 Iniciando monitoramento de notificações para usuário:", userId);

        // Verificar imediatamente
        this.checkStatusChanges();

        // Configurar polling
        this.pollingInterval = setInterval(() => {
            if (this.isActive && this.userId) {
                this.checkStatusChanges();
            }
        }, this.pollingFrequency);
    }

    // Parar monitoramento
    stopMonitoring() {
        this.isActive = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        console.log("🛑 Monitoramento de notificações parado");
    }

    // Verificar mudanças de status
    async checkStatusChanges() {
        if (!this.userId) return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_status_changes',
                    user_id: this.userId
                })
            });

            if (!response.ok) {
                console.error("Erro ao verificar mudanças:", response.status);
                return;
            }

            const result = await response.json();

            if (result.success && result.data.count > 0) {
                console.log("🔔 Mudanças detectadas:", result.data.count);
                this.handleStatusChanges(result.data.changes);
            }
        } catch (error) {
            console.error("Erro ao verificar mudanças de status:", error);
        }
    }

    // Processar mudanças de status
    handleStatusChanges(changes) {
        changes.forEach(change => {
            this.showStatusChangeNotification(change);
        });

        // Atualizar painel se estiver ativo
        if (window.painelUpdateCallback) {
            window.painelUpdateCallback();
        }
    }

    // ✅ ATUALIZADO: Exibir notificação e enviar e-mail
    async showStatusChangeNotification(change) {
        // Mensagens personalizadas
        const statusMessages = {
            'pending': {
                title: '⏳ Proposta Pendente',
                body: 'Hum, sua proposta ficou pendente de alguma informação, nosso especialista entrará em contato em breve!'
            },
            'approved': {
                title: '✅ Aprovado! Parabéns!',
                body: 'Seu crédito foi aprovado, nosso especialista entrará em contato em breve!'
            },
            'rejected': {
                title: '❌ Proposta Recusada',
                body: 'Suas informações não foram compatíveis com o seu pedido de crédito, nesse momento. Mas não se desanime! Podemos fazer uma nova tentativa após 45 dias.'
            },
            'analyzing': {
                title: '📋 Em análise',
                body: 'Olá, seu crédito está sendo analisado nesse momento, pedimos que acompanhe o status nessa plataforma.'
            },
            'formalizada': {
                title: '🎉 Deu tudo certo!',
                body: 'Agora é só comemorar! Ficamos felizes com a sua conquista e continue contando com a gente aqui, tá!? Sua primeira parcela será para daqui a 30 dias! Fique atento ao seu carnê, ele deverá chegar no seu e-mail em até 15 dias. Se não chegar, nos peça aqui, ok!? Que Deus abençoe você e sua família. Família Ccapi'
            }
        };

        const statusData = statusMessages[change.status] || {
            title: `Proposta #${change.id}`,
            body: `Status atualizado para: ${change.status}`
        };

        if (change.status === 'formalizada' && change.bank_name && change.bank_name.trim() !== '') {
            statusData.body += `\n\n🏦 Banco: ${change.bank_name}`;
        }

        // 1. Notificação do Sistema (Browser/Tauri)
        if (("Notification" in window) && Notification.permission === "granted") {
            const notification = new Notification(statusData.title, {
                body: statusData.body,
                icon: "IMG/Logo Ccapi-Photoroom.png",
                tag: `proposal-${change.id}`
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (typeof showPainel === 'function') {
                    showPainel();
                    setTimeout(() => {
                        const proposalsTab = document.querySelector('.menu-item[data-section="proposals"]');
                        if (proposalsTab) proposalsTab.click();
                    }, 500);
                }
            };
        }

        // O envio de e-mail agora é processado automaticamente pelo servidor (PHP).

        console.log("🔔 Notificação processada:", statusData.title);
    }

    // Verificar se notificações estão ativas
    isSupported() {
        return "Notification" in window;
    }

    // Obter status da permissão
    getPermissionStatus() {
        if (!this.isSupported()) return "not-supported";
        return Notification.permission;
    }
}

// Criar instância global
window.notificationSystem = new NotificationSystem();

console.log("✅ Sistema de Notificações carregado!");

// ✅ SISTEMA DE RECUPERAÇÃO DE SENHA - Ccapi Financiamentos

document.addEventListener("DOMContentLoaded", () => {

    console.log("Ccapi App Initialized");
    fillYearSelects();

    const moneyFields = ['clientIncomePF', 'clientIncomePJ', 'vehicleValue', 'financeValue', 'downPayment', 'clientIncome'];
    moneyFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.oninput = (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    value = (parseFloat(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    e.target.value = value;
                }
            };
        }
    });

    setupDashboardControls();
    setupHomeButtons();
    setupCEPListeners();
    setupInstagramAutoScroll();
    // Instagram posts agora são gerenciados via HTML - sem carregamento via JS
    if (typeof updateAllUserInfo === 'function') updateAllUserInfo();
    
    // ✅ INICIALIZAR FUNCIONALIDADES DE FOTO DE PERFIL
    setupProfilePictureUpload();
    loadProfilePictureFromStorage();


    // --- CÓDIGO DE BIOMETRIA ADICIONADO ---
    async function clicarNoBotao() {
        try {
            const result = await authenticate("Acesse sua conta CCAPI");
            if (result) {
                alert("Biometria confirmada!");
                const currentUser = JSON.parse(localStorage.getItem("currentUser"));
                if (currentUser) {
                    if (typeof window.openPainel === "function") {
                        window.openPainel();
                    } else {
                        const painel = document.getElementById("painel");
                        if (painel) painel.classList.add("active");
                    }
                } else {
                    alert("Por favor, faça login com senha primeiro para habilitar a biometria.");
                }
            }
        } catch (err) {
            alert("Erro detalhado: " + err);
        }
    }
    window.clicarNoBotao = clicarNoBotao;
    // --------------------------------------
    console.log("✅ Sistema de Recuperação de Senha carregado!");

    const API_URL = 'https://ccapi.com.br/api.php';

    // ========== MODAIS ==========
    const loginModal = document.getElementById("loginModal");
    const forgotPasswordModal = document.getElementById("forgotPasswordModal");
    const resetPasswordModal = document.getElementById("resetPasswordModal");
    const emailSentModal = document.getElementById("emailSentModal");
    const lostEmailModal = document.getElementById("lostEmailModal");
    const verifyDataForEmailModal = document.getElementById("verifyDataForEmailModal");
    const updateEmailPasswordModal = document.getElementById("updateEmailPasswordModal");

    // ========== LINKS E BOTÕES ==========
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const backToLoginLink = document.getElementById("backToLogin");
    const lostEmailLink = document.getElementById("lostEmailLink");
    const backToLoginFromEmail = document.getElementById("backToLoginFromEmail");
    
    // ========== VARIÁVEIS DE ESTADO ==========
    let currentUserRecoveryData = null;

    // ========== FUNÇÕES DE NOTIFICAÇÃO ==========
    // showNotification agora é global e definida no início do script

    // ========== FUNÇÕES DOS MODAIS ==========
    function closeAllModals() {
        if (loginModal) loginModal.classList.remove("active");
        if (forgotPasswordModal) forgotPasswordModal.classList.remove("active");
        if (resetPasswordModal) resetPasswordModal.classList.remove("active");
        if (emailSentModal) emailSentModal.classList.remove("active");
        if (lostEmailModal) lostEmailModal.classList.remove("active");
        if (verifyDataForEmailModal) verifyDataForEmailModal.classList.remove("active");
        if (updateEmailPasswordModal) updateEmailPasswordModal.classList.remove("active");
        document.body.style.overflow = "";
    }

    function openForgotPasswordModal() {
        closeAllModals();
        if (forgotPasswordModal) {
            forgotPasswordModal.classList.add("active");
            document.body.style.overflow = "hidden";
            // Limpar campo de email
            const forgotEmailInput = document.getElementById("forgotEmail");
            if (forgotEmailInput) forgotEmailInput.value = "";
        }
    }

    function openLoginModal() {
        closeAllModals();
        if (loginModal) {
            loginModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    function openResetPasswordModal(token) {
        closeAllModals();
        if (resetPasswordModal) {
            resetPasswordModal.classList.add("active");
            document.body.style.overflow = "hidden";

            // Armazenar token no campo hidden
            const tokenInput = document.getElementById("resetToken");
            if (tokenInput) tokenInput.value = token;

            // Limpar campos de senha
            const newPasswordInput = document.getElementById("newPassword");
            const confirmPasswordInput = document.getElementById("confirmPassword");
            if (newPasswordInput) newPasswordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
        }
    }

    function openEmailSentModal() {
        closeAllModals();
        if (emailSentModal) {
            emailSentModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    }

    function openLostEmailModal() {
        closeAllModals();
        if (lostEmailModal) {
            lostEmailModal.classList.add("active");
            document.body.style.overflow = "hidden";
            const recoveryEmailInput = document.getElementById("recoveryEmail");
            if (recoveryEmailInput) recoveryEmailInput.value = "";
        }
    }

    function openVerifyDataForEmailModal() {
        closeAllModals();
        if (verifyDataForEmailModal) {
            verifyDataForEmailModal.classList.add("active");
            document.body.style.overflow = "hidden";
            // Limpar campos
            document.getElementById("verifyName").value = "";
            document.getElementById("verifyCPF").value = "";
            document.getElementById("verifyPhone").value = "";
            document.getElementById("verifyPassword").value = "";
        }
    }

    function openUpdateEmailPasswordModal() {
        closeAllModals();
        if (updateEmailPasswordModal) {
            updateEmailPasswordModal.classList.add("active");
            document.body.style.overflow = "hidden";
            // Limpar campos
            document.getElementById("newEmail").value = "";
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmNewPassword").value = "";
        }
    }

    // ========== EVENT LISTENERS ==========

    // Link "Esqueceu a senha?"
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }

    // Link "Voltar ao Login"
    if (backToLoginLink) {
        backToLoginLink.addEventListener("click", (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }

    // Link "Perdeu e-mail?"
    if (lostEmailLink) {
        lostEmailLink.addEventListener("click", (e) => {
            e.preventDefault();
            openLostEmailModal();
        });
    }

    // Link "Voltar ao Login" do modal de recuperação de email
    if (backToLoginFromEmail) {
        backToLoginFromEmail.addEventListener("click", (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }

    // Fechar modais ao clicar no X
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Fechar modais ao clicar fora
    window.addEventListener("click", (e) => {
        if (e.target === loginModal ||
            e.target === forgotPasswordModal ||
            e.target === resetPasswordModal ||
            e.target === emailSentModal ||
            e.target === lostEmailModal ||
            e.target === verifyDataForEmailModal ||
            e.target === updateEmailPasswordModal) {
            closeAllModals();
        }
    });

    // ========== FORMULÁRIO DE RECUPERAÇÃO DE SENHA ==========
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById("forgotEmail");
            const email = emailInput.value.trim();

            if (!email || !isValidEmail(email)) {
                showNotification("Por favor, digite um email válido", "error");
                return;
            }

            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'forgot_password',
                        email: email
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    // Abrir modal de confirmação
                    openEmailSentModal();
                    showNotification("Email de recuperação enviado!", "success");
                } else {
                    showNotification(result.error || "Erro ao enviar email", "error");
                }
            } catch (error) {
                console.error('Erro ao solicitar recuperação:', error);
                showNotification("Erro de conexão. Tente novamente.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // ========== FORMULÁRIO DE REDEFINIÇÃO DE SENHA ==========
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const tokenInput = document.getElementById("resetToken");
            const newPasswordInput = document.getElementById("newPassword");
            const confirmPasswordInput = document.getElementById("confirmPassword");

            const token = tokenInput.value.trim();
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validações
            if (!token) {
                showNotification("Token inválido", "error");
                return;
            }

            if (newPassword.length < 6) {
                showNotification("A senha deve ter no mínimo 6 caracteres", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                showNotification("As senhas não coincidem", "error");
                return;
            }

            const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Redefinindo...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reset_password',
                        token: token,
                        password: newPassword
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    showNotification("Senha redefinida com sucesso!", "success");
                    closeAllModals();

                    // Abrir modal de login após 1.5 segundos
                    setTimeout(() => {
                        openLoginModal();
                    }, 1500);
                } else {
                    showNotification(result.error || "Erro ao redefinir senha", "error");
                }
            } catch (error) {
                console.error('Erro ao redefinir senha:', error);
                showNotification("Erro de conexão. Tente novamente.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // ========== FORMULÁRIO DE RECUPERAÇÃO DE EMAIL ==========
    const lostEmailForm = document.getElementById("lostEmailForm");
    if (lostEmailForm) {
        lostEmailForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const recoveryEmailInput = document.getElementById("recoveryEmail");
            const recoveryEmail = recoveryEmailInput.value.trim();

            if (!recoveryEmail || !isValidEmail(recoveryEmail)) {
                showNotification("Por favor, digite um email válido", "error");
                return;
            }

            const submitBtn = lostEmailForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'lost_email_request',
                        new_email: recoveryEmail
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    showNotification("Link de confirmação enviado para o email!", "success");
                    // Armazenar o email para uso posterior
                    sessionStorage.setItem('recoveryEmail', recoveryEmail);
                    // Abrir modal de confirmação
                    openEmailSentModal();
                } else {
                    showNotification(result.error || "Erro ao enviar email", "error");
                }
            } catch (error) {
                console.error('Erro ao solicitar recuperação de email:', error);
                showNotification("Erro de conexão. Tente novamente.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // ========== FORMULÁRIO DE VERIFICAÇÃO DE DADOS ==========
    const verifyDataForm = document.getElementById("verifyDataForm");
    if (verifyDataForm) {
        verifyDataForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("verifyName").value.trim();
            const cpf = document.getElementById("verifyCPF").value.trim();
            const phone = document.getElementById("verifyPhone").value.trim();
            const password = document.getElementById("verifyPassword").value;

            if (!name || !cpf || !phone || !password) {
                showNotification("Por favor, preencha todos os campos", "error");
                return;
            }

            const submitBtn = verifyDataForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_user_data',
                        name: name,
                        cpf_cnpj: cpf,
                        phone: phone,
                        password: password
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    // Armazenar dados do usuário para uso posterior
                    currentUserRecoveryData = result.user;
                    showNotification("Dados verificados com sucesso!", "success");
                    openUpdateEmailPasswordModal();
                } else {
                    showNotification(result.error || "Dados não correspondem ao cadastro", "error");
                }
            } catch (error) {
                console.error('Erro ao verificar dados:', error);
                showNotification("Erro de conexão. Tente novamente.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // ========== FORMULÁRIO DE ATUALIZAÇÃO DE EMAIL E SENHA ==========
    const updateEmailPasswordForm = document.getElementById("updateEmailPasswordForm");
    if (updateEmailPasswordForm) {
        updateEmailPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const newEmail = document.getElementById("newEmail").value.trim();
            const newPassword = document.getElementById("newPassword").value;
            const confirmNewPassword = document.getElementById("confirmNewPassword").value;

            if (!newEmail || !isValidEmail(newEmail)) {
                showNotification("Por favor, digite um email válido", "error");
                return;
            }

            if (newPassword.length < 6) {
                showNotification("A senha deve ter no mínimo 6 caracteres", "error");
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showNotification("As senhas não coincidem", "error");
                return;
            }

            if (!currentUserRecoveryData) {
                showNotification("Erro: dados do usuário não encontrados", "error");
                return;
            }

            const submitBtn = updateEmailPasswordForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Atualizando...';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_email_password',
                        user_id: currentUserRecoveryData.id,
                        new_email: newEmail,
                        new_password: newPassword
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    showNotification("Email e senha atualizados com sucesso!", "success");
                    currentUserRecoveryData = null;
                    closeAllModals();
                    
                    // Abrir modal de login após 1.5 segundos
                    setTimeout(() => {
                        openLoginModal();
                    }, 1500);
                } else {
                    showNotification(result.error || "Erro ao atualizar dados", "error");
                }
            } catch (error) {
                console.error('Erro ao atualizar email e senha:', error);
                showNotification("Erro de conexão. Tente novamente.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // ========== VALIDAÇÃO DE EMAIL ==========
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ========== VERIFICAR SE HÁ TOKEN NA URL ==========
    function checkResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const token = urlParams.get('token');

        if (action === 'reset' && token) {
            console.log("Token de reset detectado na URL:", token);

            // Verificar se o token é válido
            verifyResetToken(token);
        } else if (action === 'verify_email' && token) {
            console.log("Token de verificação de email detectado na URL:", token);
            // Abrir o modal de verificação de dados conforme solicitado
            openVerifyDataForEmailModal();
        }
    }

    // ========== VERIFICAR VALIDADE DO TOKEN ==========
    async function verifyResetToken(token) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_reset_token',
                    token: token
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data.valid) {
                // Token válido - abrir modal de redefinição
                openResetPasswordModal(token);
                showNotification("Digite sua nova senha abaixo", "info");
            } else {
                showNotification("Link inválido ou expirado", "error");
                setTimeout(() => {
                    openLoginModal();
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            showNotification("Erro ao verificar link. Tente novamente.", "error");
        }
    }

    // ========== INICIALIZAÇÃO ==========
    checkResetToken();

    // Tornar função global para uso no HTML
    window.closeAllModals = closeAllModals;

    console.log("✅ Sistema de Recuperação de Senha inicializado com sucesso!");
});
// ========================================
//   SISTEMA DE TEMA CLARO/ESCURO
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Ccapi App Initialized");
    fillYearSelects();

    const moneyFields = ['clientIncomePF', 'clientIncomePJ', 'vehicleValue', 'financeValue', 'downPayment', 'clientIncome'];
    moneyFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.oninput = (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    value = (parseFloat(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    e.target.value = value;
                }
            };
        }
    });

    setupDashboardControls();
    setupHomeButtons();
    setupCEPListeners();
    setupInstagramAutoScroll();
    // Instagram posts agora são gerenciados via HTML - sem carregamento via JS
    if (typeof updateAllUserInfo === 'function') updateAllUserInfo();
    
    // ✅ INICIALIZAR FUNCIONALIDADES DE FOTO DE PERFIL
    setupProfilePictureUpload();
    loadProfilePictureFromStorage();


    // --- CÓDIGO DE BIOMETRIA ADICIONADO ---
    async function clicarNoBotao() {
        try {
            const result = await authenticate("Acesse sua conta CCAPI");
            if (result) {
                alert("Biometria confirmada!");
                const currentUser = JSON.parse(localStorage.getItem("currentUser"));
                if (currentUser) {
                    if (typeof window.openPainel === "function") {
                        window.openPainel();
                    } else {
                        const painel = document.getElementById("painel");
                        if (painel) painel.classList.add("active");
                    }
                } else {
                    alert("Por favor, faça login com senha primeiro para habilitar a biometria.");
                }
            }
        } catch (err) {
            alert("Erro detalhado: " + err);
        }
    }
    window.clicarNoBotao = clicarNoBotao;
    // --------------------------------------
    console.log("✅ Sistema de Tema carregado!");

    const painel = document.getElementById("painel");
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    // Verificar tema salvo no localStorage
    function loadTheme() {
        const savedTheme = localStorage.getItem("painelTheme");
        if (savedTheme === "dark") {
            applyDarkTheme();
        } else {
            applyLightTheme();
        }
    }

    // Aplicar tema escuro
    function applyDarkTheme() {
        if (painel) {
            painel.classList.add("dark-theme");
        }
        // document.body.classList.add("dark-theme"); // REMOVIDO: Não aplicar no body para não afetar a tela inicial
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            themeToggleBtn.title = "Modo escuro ativado";
        }
        
        // Trocar logo para branca no modo escuro (apenas dentro do painel)
        if (painel) {
            const dynamicLogos = painel.querySelectorAll('.logo-dinamica');
            dynamicLogos.forEach(logo => {
                logo.src = 'IMG/LOGO CCAPI-BRANCA.png';
            });
        }

        localStorage.setItem("painelTheme", "dark");
        console.log("🌙 Tema escuro aplicado ao painel");
    }

    // Aplicar tema claro
    function applyLightTheme() {
        if (painel) {
            painel.classList.remove("dark-theme");
        }
        // document.body.classList.remove("dark-theme"); // REMOVIDO: Garantir que não afete a tela inicial
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            themeToggleBtn.title = "Modo claro ativado";
        }

        // Trocar logo para azul no modo claro
        if (painel) {
            const dynamicLogos = painel.querySelectorAll('.logo-dinamica');
            dynamicLogos.forEach(logo => {
                logo.src = 'IMG/Logo Ccapi-Photoroom.png';
            });
        }

        localStorage.setItem("painelTheme", "light");
        console.log("☀️ Tema claro aplicado ao painel");
    }

    // Alternar tema
    function toggleTheme() {
        if (painel && painel.classList.contains("dark-theme")) {
            applyLightTheme();
        } else {
            applyDarkTheme();
        }
    }

    // Event listener para o botão de tema
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }

    // Carregar tema ao iniciar
    loadTheme();

    // --- AJUSTE PARA MOBILE/TAURI: TECLADO COBRINDO CAMPOS ---
    // Usamos delegação de eventos para garantir que campos novos/dinâmicos também funcionem
    document.addEventListener('focusin', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300); // Pequeno delay para esperar o teclado abrir no Android/iOS
        }
    });

    console.log("✅ Sistema de Tema inicializado com sucesso!");
});
// ============================================
// CÓDIGO COMPLETO E AUTO-SUFICIENTE 
// Para o Botão "Acessar Painel"
// ============================================
// Cole este código no final do seu script.js

(function() {
    'use strict';
    
    console.log("🚀 Inicializando funcionalidade do botão Painel CTA");

    // Aguardar o DOM estar completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCTAPainelButton);
    } else {
        initCTAPainelButton();
    }

    function initCTAPainelButton() {
        // Botão "Acessar Painel" na seção CTA
        const ctaPainelBtn = document.getElementById('ctaPainelBtn');
        
        if (!ctaPainelBtn) {
            console.warn('⚠️ Botão ctaPainelBtn não encontrado no DOM');
            return;
        }

        console.log('✅ Botão Painel CTA encontrado e configurado');

        // Event listener para o clique
        ctaPainelBtn.addEventListener('click', handlePainelButtonClick);
    }

    function handlePainelButtonClick(e) {
        e.preventDefault();
        console.log("🎯 Botão 'Acessar Painel' clicado");
        
        // Verificar se o usuário está logado
        const currentUser = getCurrentUser();
        
        if (currentUser && currentUser.id) {
            // Usuário está logado - Abrir painel
            console.log("✅ Usuário logado:", currentUser.name);
            openPainel();
        } else {
            // Usuário não está logado - Abrir modal de login
            console.log("⚠️ Usuário não logado - Abrindo modal de login");
            openLoginModal();
        }
    }

    // ============================================
    // FUNÇÕES AUXILIARES
    // ============================================

    /**
     * Obtém o usuário atual do localStorage
     */
    function getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário:', error);
            return null;
        }
    }

    /**
     * Abre o modal de login
     */
    function openLoginModal() {
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            console.error('❌ Modal de login não encontrado');
            return;
        }

        // Fechar outros modais que possam estar abertos
        closeAllModals();

        // Abrir modal de login
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Limpar campos do formulário
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        console.log('📝 Modal de login aberto');
    }

    /**
     * Abre o painel
     */
    function openPainel() {
        const painel = document.getElementById('painel');
        
        if (!painel) {
            console.error('❌ Painel não encontrado');
            return;
        }

        // Ocultar sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.classList.add('hidden');
        }

        // Fechar sidebar se estiver aberta
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');

        // Mostrar painel
        painel.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Carregar dados do usuário no painel
        loadPainelUserData();

        // Carregar estatísticas (se a função existir)
        if (typeof loadPainelStatistics === 'function') {
            loadPainelStatistics();
        }

        console.log('📊 Painel aberto com sucesso');
    }

    /**
     * Carrega os dados do usuário no painel
     */
    function loadPainelUserData() {
        const currentUser = getCurrentUser();
        
        if (!currentUser) return;

        // Atualizar nome do usuário
        const userName = document.getElementById('painelUserName');
        if (userName) {
            userName.textContent = currentUser.name || 'Usuário';
        }

        // Atualizar email do usuário
        const userEmail = document.getElementById('painelUserEmail');
        if (userEmail) {
            userEmail.textContent = currentUser.email || '';
        }

        console.log('👤 Dados do usuário carregados no painel');
    }

    /**
     * Fecha todos os modais abertos
     */
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // Tornar funções disponíveis globalmente (se necessário)
    window.openLoginModal = openLoginModal;
    window.openPainel = openPainel;
    

    console.log("✅ Funcionalidade do botão Painel CTA carregada com sucesso!");

})();

// ============================================
// CÓDIGO PARA BOTÕES DE SERVIÇO
// Redirecionar para Painel após Login
// ============================================
(function() {
    'use strict';
    
    console.log("🚀 Inicializando funcionalidade dos botões de serviço");

    // Aguardar o DOM estar completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServiceButtons);
    } else {
        initServiceButtons();
    }

    function initServiceButtons() {
        // Selecionar todos os botões de serviço
        const serviceButtons = document.querySelectorAll('.service-painel-btn');
        
        if (!serviceButtons || serviceButtons.length === 0) {
            console.warn('⚠️ Nenhum botão de serviço encontrado no DOM');
            return;
        }

        console.log(`✅ ${serviceButtons.length} botões de serviço encontrados e configurados`);

        // Event listener para todos os botões de serviço
        serviceButtons.forEach((button, index) => {
            button.addEventListener('click', handleServiceButtonClick);
            console.log(`✅ Botão de serviço ${index + 1} configurado`);
        });
    }

    function handleServiceButtonClick(e) {
        e.preventDefault();
        console.log("🎯 Botão de serviço clicado");
        
        // Verificar se o usuário está logado
        const currentUser = getCurrentUser();
        
        if (currentUser && currentUser.id) {
            // Usuário está logado - Abrir painel
            console.log("✅ Usuário logado:", currentUser.name);
            openPainel();
        } else {
            // Usuário não está logado - Abrir modal de login
            console.log("⚠️ Usuário não logado - Abrindo modal de login");
            openLoginModal();
        }
    }

    // ============================================
    // FUNÇÕES AUXILIARES
    // ============================================

    /**
     * Obtém o usuário atual do localStorage
     */
    function getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário:', error);
            return null;
        }
    }

    /**
     * Abre o modal de login
     */
    function openLoginModal() {
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            console.error('❌ Modal de login não encontrado');
            return;
        }

        // Fechar outros modais que possam estar abertos
        closeAllModals();

        // Abrir modal de login
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Limpar campos do formulário
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        console.log('📝 Modal de login aberto');
    }

    /**
     * Abre o painel
     */
    function openPainel() {
        const painel = document.getElementById('painel');
        
        if (!painel) {
            console.error('❌ Painel não encontrado');
            return;
        }

        // Ocultar sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.classList.add('hidden');
        }

        // Fechar sidebar se estiver aberta
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');

        // Mostrar painel
        painel.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Carregar dados do usuário no painel
        loadPainelUserData();

        // Carregar estatísticas (se a função existir)
        if (typeof loadPainelStatistics === 'function') {
            loadPainelStatistics();
        }

        console.log('📊 Painel aberto com sucesso');
    }

    /**
     * Carrega os dados do usuário no painel
     */
    function loadPainelUserData() {
        const currentUser = getCurrentUser();
        
        if (!currentUser) return;

        // Atualizar nome do usuário
        const userName = document.getElementById('painelUserName');
        if (userName) {
            userName.textContent = currentUser.name || 'Usuário';
        }

        // Atualizar email do usuário
        const userEmail = document.getElementById('painelUserEmail');
        if (userEmail) {
            userEmail.textContent = currentUser.email || '';
        }

        console.log('👤 Dados do usuário carregados no painel');
    }

    /**
     * Fecha todos os modais abertos
     */
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // Tornar funções disponíveis globalmente (se necessário)
    window.openLoginModal = openLoginModal;
    window.openPainel = openPainel;

    console.log("✅ Funcionalidade dos botões de serviço carregada com sucesso!");

})();


// ============================================
// CÓDIGO PARA BOTÕES DE SERVIÇO
// Redirecionar para Painel após Login
// ============================================
(function() {
    'use strict';
    
    console.log("🚀 Inicializando funcionalidade dos botões de serviço");

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServiceButtons);
    } else {
        initServiceButtons();
    }

    function initServiceButtons() {
        const serviceButtons = document.querySelectorAll('.service-painel-btn');
        
        if (!serviceButtons || serviceButtons.length === 0) {
            console.warn('⚠️ Nenhum botão de serviço encontrado no DOM');
            return;
        }

        console.log(`✅ ${serviceButtons.length} botões de serviço encontrados e configurados`);

        serviceButtons.forEach((button, index) => {
            button.addEventListener('click', handleServiceButtonClick);
            console.log(`✅ Botão de serviço ${index + 1} configurado`);
        });
    }

    function handleServiceButtonClick(e) {
        e.preventDefault();
        console.log("🎯 Botão de serviço clicado");
        
        const currentUser = getCurrentUser();
        
        if (currentUser && currentUser.id) {
            console.log("✅ Usuário logado:", currentUser.name);
            openPainel();
        } else {
            console.log("⚠️ Usuário não logado - Abrindo modal de login");
            openLoginModal();
        }
    }

    function getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário:', error);
            return null;
        }
    }

    function openLoginModal() {
        const loginModal = document.getElementById('loginModal');
        
        if (!loginModal) {
            console.error('❌ Modal de login não encontrado');
            return;
        }

        closeAllModals();
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';

        console.log('📝 Modal de login aberto');
    }

    function openPainel() {
        const painel = document.getElementById('painel');
        
        if (!painel) {
            console.error('❌ Painel não encontrado');
            return;
        }

        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.classList.add('hidden');
        }

        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');

        painel.classList.add('active');
        document.body.style.overflow = 'hidden';

        loadPainelUserData();

        console.log('📊 Painel aberto com sucesso');
    }

    function loadPainelUserData() {
        const currentUser = getCurrentUser();
        
        if (!currentUser) return;

        const userName = document.getElementById('painelUserName');
        if (userName) {
            userName.textContent = currentUser.name || 'Usuário';
        }

        const userEmail = document.getElementById('painelUserEmail');
        if (userEmail) {
            userEmail.textContent = currentUser.email || '';
        }

        console.log('👤 Dados do usuário carregados no painel');
    }

    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    window.openLoginModal = openLoginModal;
    window.openPainel = openPainel;

    console.log("✅ Funcionalidade dos botões de serviço carregada com sucesso!");

})();
// MÓDULO DE SIMULAÇÃO DE FINANCIAMENTO COM IA
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Ccapi App Initialized");
    fillYearSelects();

    const moneyFields = ['clientIncomePF', 'clientIncomePJ', 'vehicleValue', 'financeValue', 'downPayment', 'clientIncome'];
    moneyFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.oninput = (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value) {
                    value = (parseFloat(value) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    e.target.value = value;
                }
            };
        }
    });

    setupDashboardControls();
    setupHomeButtons();
    setupCEPListeners();
    setupInstagramAutoScroll();
    // Instagram posts agora são gerenciados via HTML - sem carregamento via JS
    if (typeof updateAllUserInfo === 'function') updateAllUserInfo();
    
    // ✅ INICIALIZAR FUNCIONALIDADES DE FOTO DE PERFIL
    setupProfilePictureUpload();
    loadProfilePictureFromStorage();


    // --- CÓDIGO DE BIOMETRIA ADICIONADO ---
    async function clicarNoBotao() {
        try {
            const result = await authenticate("Acesse sua conta CCAPI");
            if (result) {
                alert("Biometria confirmada!");
                const currentUser = JSON.parse(localStorage.getItem("currentUser"));
                if (currentUser) {
                    if (typeof window.openPainel === "function") {
                        window.openPainel();
                    } else {
                        const painel = document.getElementById("painel");
                        if (painel) painel.classList.add("active");
                    }
                } else {
                    alert("Por favor, faça login com senha primeiro para habilitar a biometria.");
                }
            }
        } catch (err) {
            alert("Erro detalhado: " + err);
        }
    }
    window.clicarNoBotao = clicarNoBotao;
    // --------------------------------------
    console.log("✅ Módulo de Simulação de Financiamento carregado!");

    const API_URL = 'https://ccapi.com.br/api.php';

    // Elementos do formulário
    const simulationForm = document.getElementById('financingSimulationForm');
    const simulateBtn = document.getElementById('simulateBtn');
    const simulationResults = document.getElementById('simulationResults');
    const simulationLoading = document.getElementById('simulationLoading');

    // Função para simular financiamento
    async function simulateFinancing(cpf, birthDate, vehiclePlate, vehicleBrandModel, vehicleValue, downPayment) {
        // Lógica migrada do PHP para processamento local (JavaScript)
        const determinarTipoVeiculo = (marcaModelo) => {
            const texto = marcaModelo.toUpperCase();
            if (/(SCANIA|VOLVO|MERCEDES|IVECO|DAF|MAN|CAMINHAO|CAMINHÃO|CARRETA)/i.test(texto)) {
                return 'pesado';
            } else if (/(MOTO|CG|BIZ|FACTOR|FAZER|CB|XRE|BROS|TITAN|XTZ|BURGMAN|MT|NINJA|KAWASAKI|SUZUKI|HONDA|YAMAHA)/i.test(texto)) {
                return 'moto';
            } else {
                return 'leve';
            }
        };

        const formatarMoeda = (valor) => {
            return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        const formatarNumero = (valor) => {
            return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Processamento da simulação
        const vehicleValueNum = parseFloat(vehicleValue);
        const downPaymentNum = parseFloat(downPayment || 0);
        const valorFinanciamento = vehicleValueNum - downPaymentNum;

        if (valorFinanciamento <= 0) {
            return { success: false, error: "Valor de financiamento inválido. A entrada não pode ser maior que o valor do veículo." };
        }

        const vehicleType = determinarTipoVeiculo(vehicleBrandModel);
        
        // Prazos (conforme lógica original do PHP)
        const prazoMeses = (vehicleType === 'pesado') ? 72 : ((vehicleType === 'leve') ? 60 : 48);
        
        // Taxa de juros (2,50% ao mês conforme PHP)
        const taxaJurosMensal = 2.50;
        const taxaDecimal = taxaJurosMensal / 100;
        
        // Cálculo da Parcela (Tabela Price)
        const valorParcela = valorFinanciamento * (taxaDecimal * Math.pow(1 + taxaDecimal, prazoMeses)) / (Math.pow(1 + taxaDecimal, prazoMeses) - 1);
        
        // Cálculo do CET anual aproximado
        const cetAnual = (Math.pow(1 + taxaDecimal, 12) - 1) * 100;

        // Retorno no formato esperado pela função displaySimulationResults
        return {
            success: true,
            data: {
                simulation: {
                    valor_financiamento: formatarMoeda(valorFinanciamento),
                    valor_veiculo: formatarMoeda(vehicleValueNum),
                    valor_entrada: downPaymentNum > 0 ? formatarMoeda(downPaymentNum) : 'Sem entrada',
                    prazo_meses: prazoMeses,
                    taxa_juros_mensal: formatarNumero(taxaJurosMensal) + '%',
                    valor_parcela: formatarMoeda(valorParcela),
                    cet_anual: formatarNumero(cetAnual) + '%',
                    tipo_veiculo: vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1),
                    observacoes: downPaymentNum > 0 
                        ? `Simulação considerando entrada de ${formatarMoeda(downPaymentNum)}` 
                        : "Simulação sem valor de entrada"
                }
            }
        };
    }

    // Validar CPF
    function isValidCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
        let remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.charAt(9))) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
        remainder = 11 - (sum % 11);
        if (remainder === 10 || remainder === 11) remainder = 0;
        return remainder === parseInt(cpf.charAt(10));
    }

    // Validar data de nascimento
    function isValidBirthDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12 || day < 1 || day > 31) return false;
        const birthDate = new Date(year, month - 1, day);
        if (birthDate.getDate() !== day || birthDate.getMonth() !== month - 1 || birthDate.getFullYear() !== year) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age >= 18 && age <= 100;
    }

    // Exibir resultados da simulação
     // Exibir resultados da simulação - ATUALIZADO (sem banco e custo total)
    function displaySimulationResults(data) {
        const sim = data.simulation;
        
        let html = `
            <div class="simulation-success">
                <div class="simulation-header">
                    <i class="fas fa-check-circle"></i>
                    <h3>Simulação Gerada com Sucesso!</h3>
                </div>
                
                <div class="simulation-cards">
                    <div class="sim-card">
                        <div class="sim-card-icon">
                            <i class="fas fa-car"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Valor do Veículo</span>
                            <span class="sim-card-value">${sim.valor_veiculo}</span>
                        </div>
                    </div>

                    <div class="sim-card">
                        <div class="sim-card-icon">
                            <i class="fas fa-hand-holding-usd"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Valor de Entrada</span>
                            <span class="sim-card-value">${sim.valor_entrada}</span>
                        </div>
                    </div>

                    <div class="sim-card highlight">
                        <div class="sim-card-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Valor do Financiamento</span>
                            <span class="sim-card-value">${sim.valor_financiamento}</span>
                        </div>
                    </div>

                    <div class="sim-card">
                        <div class="sim-card-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Prazo</span>
                            <span class="sim-card-value">${sim.prazo_meses} meses</span>
                        </div>
                    </div>

                    <div class="sim-card">
                        <div class="sim-card-icon">
                            <i class="fas fa-percent"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Taxa de Juros Mensal</span>
                            <span class="sim-card-value">${sim.taxa_juros_mensal}</span>
                        </div>
                    </div>

                    <div class="sim-card highlight">
                        <div class="sim-card-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">Valor da Parcela Mensal</span>
                            <span class="sim-card-value">${sim.valor_parcela}</span>
                        </div>
                    </div>

                    <div class="sim-card">
                        <div class="sim-card-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="sim-card-content">
                            <span class="sim-card-label">CET (Anual)</span>
                            <span class="sim-card-value">${sim.cet_anual}</span>
                        </div>
                    </div>
                </div>

                ${sim.observacoes ? `
                    <div class="simulation-notes">
                        <i class="fas fa-info-circle"></i>
                        <p>${sim.observacoes}</p>
                    </div>
                ` : ''}

                <div class="simulation-actions">
                    <button class="btn btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i>
                        Imprimir Simulação
                    </button>
                    <button class="btn btn-success" id="newSimulationBtn">
                        <i class="fas fa-redo"></i>
                        Nova Simulação
                    </button>
                </div>
            </div>
        `;
        
        const simulationResults = document.getElementById('simulationResults');
        const simulationForm = document.getElementById('financingSimulationForm');
        
        if (simulationResults && simulationForm) {
            simulationResults.innerHTML = html;
            simulationResults.style.display = 'block';
            simulationForm.style.display = 'none';
            
            // Adicionar evento ao botão de nova simulação
            const newSimBtn = document.getElementById('newSimulationBtn');
            if (newSimBtn) {
                newSimBtn.addEventListener('click', () => {
                    simulationResults.style.display = 'none';
                    simulationForm.style.display = 'block';
                    simulationForm.reset();
                });
            }
        }
    }

    // Event listener para o formulário
    if (simulationForm) {
        simulationForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cpf = document.getElementById('simCpf').value;
            const birthDate = document.getElementById('simBirthDate').value;
            const vehiclePlate = document.getElementById('simVehiclePlate').value;
            const vehicleBrandModel = document.getElementById('simVehicleBrandModel').value;
  // PEGAR NOVOS VALORES
            const vehicleValue = parseMoneyValue(document.getElementById('simVehicleValue').value);
            const downPayment = parseMoneyValue(document.getElementById('simDownPayment').value);
            function parseCurrency(value) {
             if (!value) return 0;
             return parseFloat(value.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
            }
            // Validações
            if (!isValidCPF(cpf)) {
                showNotification('CPF inválido', 'error');
                return;
            }

            if (!isValidBirthDate(birthDate)) {
                showNotification('Data de nascimento inválida. Idade deve ser entre 18 e 100 anos.', 'error');
                return;
            }

            if (!vehicleBrandModel.trim()) {
                showNotification('Informe a marca e modelo do veículo', 'error');
                return;
            }
                if (vehicleValue <= 0) {
                showNotification('Informe o valor do veículo', 'error');
                return;
            }

            if (downPayment > vehicleValue) {
                showNotification('Valor de entrada não pode ser maior que o valor do veículo', 'error');
                return;
            }
            // Mostrar loading
            simulationLoading.style.display = 'flex';
            simulateBtn.disabled = true;

          // Fazer simulação com NOVOS PARÂMETROS
            const result = await simulateFinancing(cpf, birthDate, vehiclePlate, vehicleBrandModel, vehicleValue, downPayment);

            // Esconder loading
            simulationLoading.style.display = 'none';
            simulateBtn.disabled = false;

            if (result.success) {
                displaySimulationResults(result.data);
                showNotification('Simulação gerada com sucesso!', 'success');
            } else {
                showNotification(result.error || 'Erro ao gerar simulação. Tente novamente.', 'error');
            }
        });
    }

    // Máscaras para os campos
    const simCpfInput = document.getElementById('simCpf');
    if (simCpfInput) {
        simCpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    const simBirthDateInput = document.getElementById('simBirthDate');
    if (simBirthDateInput) {
        simBirthDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2);
            if (value.length >= 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
            e.target.value = value;
        });
    }

    const simPlateInput = document.getElementById('simVehiclePlate');
    if (simPlateInput) {
        simPlateInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toUpperCase();
        });
    }
  // MÁSCARA DE DINHEIRO PARA VALOR DO VEÍCULO
    const simVehicleValueInput = document.getElementById('simVehicleValue');
    if (simVehicleValueInput) {
        simVehicleValueInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = (parseInt(value) / 100).toFixed(2);
                value = value.replace('.', ',');
                value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            }
            e.target.value = 'R$ ' + value;
        });
    }

    // MÁSCARA DE DINHEIRO PARA VALOR DE ENTRADA
    const simDownPaymentInput = document.getElementById('simDownPayment');
    if (simDownPaymentInput) {
        simDownPaymentInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = (parseInt(value) / 100).toFixed(2);
                value = value.replace('.', ',');
                value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            }
            e.target.value = 'R$ ' + value;
        });
    }

    console.log("✅ Simulação de Financiamento configurada!");
});

// ============================================
// CORREÇÃO: Função auxiliar parseMoneyValue
// ============================================
// Esta função converte valores monetários de string para número
// Estava faltando no escopo correto e causava erro no formulário
function parseMoneyValue(moneyString) {
    if (!moneyString) return 0;
    // Remove tudo exceto números e vírgula
    const cleaned = moneyString.replace(/[^0-9,]/g, '');
    // Substitui vírgula por ponto
    const normalized = cleaned.replace(',', '.');
    // Converte para float
    return parseFloat(normalized) || 0;
}

// Garantir que está disponível globalmente
window.parseMoneyValue = parseMoneyValue;

console.log("✅ CORREÇÃO APLICADA: Função parseMoneyValue adicionada!");

// ==========================================
// MÓDULO DE SAÚDE FINANCEIRA
// ==========================================

(function() {
    console.log("✅ Módulo de Saúde Financeira carregado!");

    let healthChart = null; // Variável global para o gráfico

    // Função para converter valor monetário de string para número
    function parseMoneyValue(moneyString) {
        if (!moneyString) return 0;
        const cleaned = moneyString.replace(/[^0-9,]/g, '');
        const normalized = cleaned.replace(',', '.');
        return parseFloat(normalized) || 0;
    }

    // Função para formatar valor como moeda
    function formatMoney(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Aplicar máscara de dinheiro nos campos (Formatação Profissional)
    const moneyInputs = document.querySelectorAll('#monthlyIncome, #installmentValue');
    moneyInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                const formattedValue = new Intl.NumberFormat('pt-BR', options).format(
                    parseFloat(value) / 100
                );
                e.target.value = 'R$ ' + formattedValue;
            } else {
                e.target.value = '';
            }
        });
    });

    // Event listener para o formulário
    const healthForm = document.getElementById('financialHealthForm');
    if (healthForm) {
        healthForm.addEventListener('submit', function(e) {
            e.preventDefault(); // EVITA O RELOAD DA PÁGINA
            
            console.log("📊 Calculando saúde financeira...");

            // Pegar valores dos campos
            const monthlyIncomeStr = document.getElementById('monthlyIncome').value;
            const installmentValueStr = document.getElementById('installmentValue').value;

            const monthlyIncome = parseMoneyValue(monthlyIncomeStr);
            const installmentValue = parseMoneyValue(installmentValueStr);

            // Validações
            if (monthlyIncome <= 0) {
                if (typeof showNotification === 'function') {
                    showNotification('Por favor, informe sua renda mensal', 'error');
                } else {
                    alert('Por favor, informe sua renda mensal');
                }
                return;
            }

            if (installmentValue <= 0) {
                if (typeof showNotification === 'function') {
                    showNotification('Por favor, informe o valor da parcela', 'error');
                } else {
                    alert('Por favor, informe o valor da parcela');
                }
                return;
            }

            if (installmentValue > monthlyIncome) {
                if (typeof showNotification === 'function') {
                    showNotification('A parcela não pode ser maior que sua renda!', 'error');
                } else {
                    alert('A parcela não pode ser maior que sua renda!');
                }
                return;
            }

            // Calcular porcentagem
            const percentage = (installmentValue / monthlyIncome) * 100;
            const availableIncome = monthlyIncome - installmentValue;

            // Determinar status e mensagens
            let status, statusClass, message, iconClass;
            
            if (percentage <= 20) {
                status = 'Crédito Saudável!';
                statusClass = 'status-green';
                message = '🎉 Parabéns! Sua parcela está em um nível excelente. Os bancos vão adorar aprovar seu crédito!';
                iconClass = 'fa-check-circle';
            } else if (percentage <= 30) {
                status = 'Atenção!';
                statusClass = 'status-yellow';
                message = '⚠️ Cuidado! Você está no limite. O banco vai analisar com mais atenção, mas ainda há boas chances de aprovação.';
                iconClass = 'fa-exclamation-triangle';
            } else {
                status = 'Risco Alto!';
                statusClass = 'status-red';
                message = '🚨 Opa! A parcela está pesada demais. Sugerimos aumentar a entrada para reduzir a parcela e melhorar suas chances.';
                iconClass = 'fa-times-circle';
            }

            // Atualizar elementos do resultado
            const healthStatusEl = document.getElementById('healthStatus');
            const commitmentPercentageEl = document.getElementById('commitmentPercentage');
            const healthMessageEl = document.getElementById('healthMessage');
            const detailIncomeEl = document.getElementById('detailIncome');
            const detailInstallmentEl = document.getElementById('detailInstallment');
            const detailAvailableEl = document.getElementById('detailAvailable');

            if (healthStatusEl) healthStatusEl.textContent = status;
            if (commitmentPercentageEl) commitmentPercentageEl.textContent = percentage.toFixed(1) + '%';
            if (healthMessageEl) healthMessageEl.textContent = message;
            
            if (detailIncomeEl) detailIncomeEl.textContent = formatMoney(monthlyIncome);
            if (detailInstallmentEl) detailInstallmentEl.textContent = formatMoney(installmentValue);
            if (detailAvailableEl) detailAvailableEl.textContent = formatMoney(availableIncome);

            // Atualizar classes do card
            const healthCard = document.getElementById('healthCard');
            if (healthCard) {
                healthCard.className = 'health-card ' + statusClass;

                // Atualizar ícone
                const headerIcon = healthCard.querySelector('.health-card-header i');
                if (headerIcon) {
                    headerIcon.className = 'fas ' + iconClass;
                }
            }

            // Criar/Atualizar gráfico (Substituído por SVG para máxima compatibilidade)
            createHealthChartSVG(percentage, 100 - percentage, statusClass);

            // Mostrar resultado e esconder formulário
            const formElement = document.getElementById('financialHealthForm');
            const resultElement = document.getElementById('healthResult');
            
            if (formElement) formElement.style.display = 'none';
            if (resultElement) resultElement.style.display = 'block';

            if (typeof showNotification === 'function') {
                showNotification('Análise concluída!', 'success');
            }

            console.log("✅ Saúde financeira calculada:", percentage.toFixed(1) + "%");
        });
    }

    // Função para criar o gráfico usando SVG (Não depende de bibliotecas externas)
    function createHealthChartSVG(percentage, available, statusClass) {
        const container = document.querySelector('.health-chart-container');
        if (!container) return;

        // Definir cores
        let color = '#ef4444'; // Red
        if (statusClass.includes('green')) color = '#10b981';
        else if (statusClass.includes('yellow')) color = '#f59e0b';

        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        container.innerHTML = `
            <h4 style="text-align: center; margin-bottom: 15px;">Comprometimento de Renda</h4>
            <div style="display: flex; justify-content: center; align-items: center; position: relative; height: 250px;">
                <svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg);">
                    <!-- Fundo -->
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="#e5e7eb" stroke-width="20" />
                    <!-- Progresso -->
                    <circle cx="100" cy="100" r="${radius}" fill="transparent" stroke="${color}" stroke-width="20" 
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
                        style="transition: stroke-dashoffset 1s ease-out;" />
                </svg>
                <div style="position: absolute; text-align: center;">
                    <span style="font-size: 2rem; font-weight: 800; color: ${color}; display: block;">${percentage.toFixed(1)}%</span>
                    <span style="font-size: 0.8rem; color: #6b7280;">Comprometido</span>
                </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
                    <span style="font-size: 0.85rem; font-weight: 500;">Parcela</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: #e5e7eb;"></div>
                    <span style="font-size: 0.85rem; font-weight: 500;">Disponível</span>
                </div>
            </div>
        `;
        console.log("✅ Gráfico SVG de Saúde Financeira criado!");
    }

    // Botão de nova verificação
    const newHealthCheckBtn = document.getElementById('newHealthCheckBtn');
    if (newHealthCheckBtn) {
        newHealthCheckBtn.addEventListener('click', function() {
            console.log("🔄 Resetando verificação de saúde financeira...");
            
            // Resetar formulário
            const formElement = document.getElementById('financialHealthForm');
            if (formElement) {
                formElement.reset();
                formElement.style.display = 'block';
            }
            
            // Esconder resultado
            const resultElement = document.getElementById('healthResult');
            if (resultElement) {
                resultElement.style.display = 'none';
            }
            
            // Destruir gráfico
            if (healthChart) {
                healthChart.destroy();
                healthChart = null;
            }
        });
    }

    console.log("✅ Saúde Financeira configurada e pronta!");

})();

// ==========================================
// MÓDULO DE LINHA DE TEMPO (QUITAÇÃO)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
(function() {
    console.log("✅ Módulo de Linha de Tempo carregado!");

    let selectedMultiplier = 2; // Padrão: 2x
    let customValue = 0;
    let timelineChart = null;

    // Função para converter valor monetário de string para número
    function parseMoneyValue(moneyString) {
        if (!moneyString) return 0;
        const cleaned = moneyString.replace(/[^0-9,]/g, '');
        const normalized = cleaned.replace(',', '.');
        return parseFloat(normalized) || 0;
    }

    // Função para formatar valor como moeda
    function formatMoney(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Aplicar máscara de dinheiro nos campos de valor (Formatação Profissional)
    const moneyInputs = document.querySelectorAll('#tlFinanceValue, #tlCustomValue');
    moneyInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                // Converte para número e formata com Intl.NumberFormat para precisão total
                const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                const formattedValue = new Intl.NumberFormat('pt-BR', options).format(
                    parseFloat(value) / 100
                );
                e.target.value = 'R$ ' + formattedValue;
            } else {
                e.target.value = '';
            }
        });
    });

    // Seleção de opções de pagamento
    const paymentOptionBtns = document.querySelectorAll('.payment-option-btn');
    const customValueInput = document.getElementById('tlCustomValue');

    paymentOptionBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active de todos
            paymentOptionBtns.forEach(b => b.classList.remove('active'));
            
            // Adiciona active no clicado
            this.classList.add('active');
            
            const multiplier = this.dataset.multiplier;
            
            if (multiplier === 'custom') {
                customValueInput.style.display = 'block';
                selectedMultiplier = 'custom';
            } else {
                customValueInput.style.display = 'none';
                selectedMultiplier = parseFloat(multiplier);
            }
        });
    });

    // Calcular Amortização (Sistema Price)
    function calculateAmortization(principal, monthlyRate, months) {
        const rate = monthlyRate / 100;
        const installment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        
        let balance = principal;
        const schedule = [];
        let totalInterest = 0;

        for (let month = 1; month <= months; month++) {
            const interest = balance * rate;
            const amortization = installment - interest;
            balance -= amortization;
            totalInterest += interest;

            schedule.push({
                month,
                balance: Math.max(0, balance),
                payment: installment,
                interest,
                amortization
            });

            if (balance <= 0) break;
        }

        return {
            installment,
            schedule,
            totalInterest,
            totalPaid: principal + totalInterest,
            months: schedule.length
        };
    }

    // Calcular cenário acelerado
    function calculateAcceleratedScenario(principal, monthlyRate, normalInstallment, multiplier, customAmount = 0) {
        const rate = monthlyRate / 100;
        let balance = principal;
        const schedule = [];
        let totalInterest = 0;
        let month = 1;

        let monthlyPayment;
        if (multiplier === 'custom') {
            monthlyPayment = normalInstallment + customAmount;
        } else {
            monthlyPayment = normalInstallment * multiplier;
        }

        while (balance > 0.01 && month <= 1200) { // Limite de segurança aumentado para 100 anos
            const interest = balance * rate;
            
            // Se os juros forem maiores que o pagamento, o saldo nunca diminuirá (loop infinito)
            if (interest >= monthlyPayment) {
                // Ajustamos o pagamento para ser pelo menos os juros + 1 real para evitar o loop
                monthlyPayment = interest + 1;
            }

            const amortization = monthlyPayment - interest;
            
            // Se o pagamento for maior que o saldo + juros, paga só o restante
            if (monthlyPayment >= balance + interest) {
                const finalPayment = balance + interest;
                schedule.push({
                    month,
                    balance: 0,
                    payment: finalPayment,
                    interest,
                    amortization: balance
                });
                totalInterest += interest;
                balance = 0;
                break;
            }

            balance -= amortization;
            totalInterest += interest;

            schedule.push({
                month,
                balance: Math.max(0, balance),
                payment: monthlyPayment,
                interest,
                amortization
            });

            month++;
        }

        return {
            installment: monthlyPayment,
            schedule,
            totalInterest,
            totalPaid: principal + totalInterest,
            months: schedule.length
        };
    }

    // Criar gráfico de linha do tempo
    function createTimelineChart(normalMonths, acceleratedMonths) {
        const ctx = document.getElementById('timelineChart');
        
        if (!ctx) {
            console.error('Canvas do gráfico não encontrado');
            return;
        }

        // Verificar se Chart.js está carregado
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado!');
            return;
        }

        // Destruir gráfico anterior se existir
        if (timelineChart) {
            timelineChart.destroy();
        }

        const maxMonths = Math.max(normalMonths, acceleratedMonths);

        // Criar novo gráfico
        timelineChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pagamento Normal', 'Pagamento Acelerado'],
                datasets: [{
                    label: 'Tempo de Quitação (meses)',
                    data: [normalMonths, acceleratedMonths],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return 'Tempo: ' + context.parsed.y + ' meses';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: maxMonths + 5,
                        ticks: {
                            callback: function(value) {
                                return value + ' meses';
                            },
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        console.log("📊 Gráfico de linha do tempo criado!");
    }

    // Preencher tabela de amortização
    function fillAmortizationTable(schedule) {
        const tbody = document.getElementById('amortizationTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Mostrar apenas os primeiros 12 meses
        const months = schedule.slice(0, 12);

        months.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.month}</td>
                <td>${formatMoney(row.balance)}</td>
                <td>${formatMoney(row.payment)}</td>
                <td>${formatMoney(row.interest)}</td>
                <td>${formatMoney(row.amortization)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Event listener para o formulário
    const timelineForm = document.getElementById('timelineForm');
    if (timelineForm) {
        // Unificamos o tratamento do submit para evitar conflitos e recarregamento
        timelineForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                console.log("📊 Calculando linha de tempo...");

                // Pegar valores dos campos
                const financeValueStr = document.getElementById('tlFinanceValue').value;
                const installmentsStr = document.getElementById('tlInstallments').value;
                const interestRateStr = document.getElementById('tlInterestRate').value;

                const financeValue = parseMoneyValue(financeValueStr);
                const installments = parseInt(installmentsStr);
                const interestRate = parseFloat(interestRateStr);

                // Validações
                if (financeValue <= 0) {
                    if (typeof showNotification === 'function') {
                        showNotification('Por favor, informe o valor do financiamento', 'error');
                    } else {
                        alert('Por favor, informe o valor do financiamento');
                    }
                    return;
                }

                if (isNaN(installments) || installments < 6 || installments > 120) {
                    if (typeof showNotification === 'function') {
                        showNotification('Número de parcelas deve estar entre 6 e 120', 'error');
                    } else {
                        alert('Número de parcelas deve estar entre 6 e 120');
                    }
                    return;
                }

                if (isNaN(interestRate) || interestRate <= 0 || interestRate > 10) {
                    if (typeof showNotification === 'function') {
                        showNotification('Taxa de juros deve estar entre 0.1% e 10%', 'error');
                    } else {
                        alert('Taxa de juros deve estar entre 0.1% e 10%');
                    }
                    return;
                }

                // Se for custom, pegar o valor adicional
                if (selectedMultiplier === 'custom') {
                    const customValueStr = document.getElementById('tlCustomValue').value;
                    customValue = parseMoneyValue(customValueStr);
                    
                    if (customValue <= 0) {
                        if (typeof showNotification === 'function') {
                            showNotification('Por favor, informe o valor adicional', 'error');
                        } else {
                            alert('Por favor, informe o valor adicional');
                        }
                        return;
                    }
                }

                // Calcular cenário normal
                const normalScenario = calculateAmortization(financeValue, interestRate, installments);

                // Calcular cenário acelerado
                const acceleratedScenario = calculateAcceleratedScenario(
                    financeValue, 
                    interestRate, 
                    normalScenario.installment, 
                    selectedMultiplier,
                    customValue
                );

                // Calcular economia
                const savingsInterest = normalScenario.totalInterest - acceleratedScenario.totalInterest;
                const savingsTime = normalScenario.months - acceleratedScenario.months;

                // Atualizar elementos do resultado
                const elements = {
                    'normalTime': normalScenario.months + ' meses',
                    'normalInterest': formatMoney(normalScenario.totalInterest),
                    'normalTotal': formatMoney(normalScenario.totalPaid),
                    'normalInstallment': formatMoney(normalScenario.installment),
                    'acceleratedTime': acceleratedScenario.months + ' meses',
                    'acceleratedInterest': formatMoney(acceleratedScenario.totalInterest),
                    'acceleratedTotal': formatMoney(acceleratedScenario.totalPaid),
                    'acceleratedInstallment': formatMoney(acceleratedScenario.installment),
                    'savingsAmount': formatMoney(savingsInterest),
                    'savingsTime': savingsTime + ' meses mais cedo!'
                };

                for (const [id, value] of Object.entries(elements)) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                }

                // Atualizar badge
                const badge = document.getElementById('acceleratedBadge');
                if (badge) {
                    badge.textContent = (selectedMultiplier === 'custom') 
                        ? '+ ' + formatMoney(customValue) + '/mês' 
                        : selectedMultiplier + 'x por mês';
                }

                // Criar gráfico
                const timelineCanvas = document.getElementById('timelineChart');
                if (timelineCanvas) {
                    if (typeof createTimelineChartFixed === 'function') {
                        createTimelineChartFixed(timelineCanvas, normalScenario.months, acceleratedScenario.months);
                    } else {
                        createTimelineChart(normalScenario.months, acceleratedScenario.months);
                    }
                }

                // Preencher tabela de amortização
                fillAmortizationTable(acceleratedScenario.schedule);

                // Mostrar resultado e esconder formulário
                const formElement = document.getElementById('timelineForm');
                const resultElement = document.getElementById('timelineResults');
                
                if (formElement) formElement.style.display = 'none';
                if (resultElement) resultElement.style.display = 'block';

                if (typeof showNotification === 'function') {
                    showNotification('Simulação calculada com sucesso!', 'success');
                }

                console.log("✅ Linha de tempo calculada!");
            } catch (error) {
                console.error("❌ Erro no cálculo:", error);
                if (typeof showNotification === 'function') {
                    showNotification('Erro ao calcular. Verifique os dados.', 'error');
                } else {
                    alert('Erro ao calcular. Verifique os dados.');
                }
            }
        });
    }

    // Botão de nova simulação
    const newTimelineCalc = document.getElementById('newTimelineCalc');
    if (newTimelineCalc) {
        newTimelineCalc.addEventListener('click', function() {
            console.log("🔄 Resetando linha de tempo...");
            
            // Resetar formulário
            const formElement = document.getElementById('timelineForm');
            if (formElement) {
                formElement.reset();
                formElement.style.display = 'block';
            }
            
            // Esconder resultado
            const resultElement = document.getElementById('timelineResults');
            if (resultElement) {
                resultElement.style.display = 'none';
            }
            
            // Destruir gráfico
            if (timelineChart) {
                timelineChart.destroy();
                timelineChart = null;
            }

            // Resetar seleção
            selectedMultiplier = 2;
            customValueInput.style.display = 'none';
            paymentOptionBtns.forEach(btn => {
                if (btn.dataset.multiplier === '2') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }

    console.log("✅ Linha de Tempo configurada e pronta!");

})(); // Fim do IIFE do módulo de Linha de Tempo
}); // Fim do DOMContentLoaded do módulo de Linha de Tempo

// ==========================================
// 🔧 CORREÇÃO DOS GRÁFICOS - CHART.JS
// ==========================================
// Esta correção garante que todos os gráficos funcionem corretamente
// Adicionado em: 28/01/2026

console.log("📊 Inicializando correção de gráficos...");

// Verificar se Chart.js está disponível
if (typeof Chart === 'undefined') {
    console.warn("⚠️ Chart.js não encontrado, carregando dinamicamente...");
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => {
        console.log("✅ Chart.js carregado com sucesso!");
        initializeAllCharts();
    };
    script.onerror = () => {
        console.error("❌ Erro ao carregar Chart.js!");
    };
    document.head.appendChild(script);
} else {
    console.log("✅ Chart.js já está disponível!");
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAllCharts);
    } else {
        initializeAllCharts();
    }
}

// Função para inicializar todos os gráficos
function initializeAllCharts() {
    console.log("🎨 Inicializando todos os gráficos...");
    
    // Aguardar um pouco para garantir que todos os elementos do DOM estejam prontos
    setTimeout(() => {
        // Verificar cada canvas e criar o gráfico correspondente
        checkAndCreateChart('timelineChart', createTimelineChartFixed);
        checkAndCreateChart('healthChart', createHealthChartFixed);
        checkAndCreateChart('statisticsChart', createStatisticsChartFixed);
        checkAndCreateChart('amortizationChart', createAmortizationChartFixed);
    }, 500);
}

// Função auxiliar para verificar e criar gráfico
function checkAndCreateChart(canvasId, createFunction) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        console.log(`✅ Canvas encontrado: ${canvasId}`);
        try {
            createFunction(canvas);
        } catch (error) {
            console.error(`❌ Erro ao criar gráfico ${canvasId}:`, error);
        }
    } else {
        console.log(`⏭️ Canvas não encontrado: ${canvasId} (será criado quando necessário)`);
    }
}

// Gráfico de Linha do Tempo (Timeline Chart)
function createTimelineChartFixed(canvas, normalMonths = 60, acceleratedMonths = 42) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não disponível para timelineChart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    canvas.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pagamento Normal', 'Pagamento Acelerado'],
            datasets: [{
                label: 'Tempo de Quitação (meses)',
                data: [normalMonths, acceleratedMonths],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return 'Tempo: ' + context.parsed.y + ' meses';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' meses';
                        }
                    }
                }
            }
        }
    });

    console.log("✅ Gráfico de Timeline criado!");
    return canvas.chart;
}

// Gráfico de Saúde Financeira (Health Chart)
function createHealthChartFixed(canvas, commitmentPercentage = 25, availablePercentage = 75, statusClass = 'status-yellow') {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não disponível para healthChart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Definir cores baseado no status
    let commitmentColor, availableColor;
    
    if (statusClass === 'status-green' || statusClass.includes('green')) {
        commitmentColor = '#10b981';
        availableColor = '#d1fae5';
    } else if (statusClass === 'status-yellow' || statusClass.includes('yellow')) {
        commitmentColor = '#f59e0b';
        availableColor = '#fef3c7';
    } else {
        commitmentColor = '#ef4444';
        availableColor = '#fee2e2';
    }

    // Garantir que os valores sejam números
    const data1 = parseFloat(commitmentPercentage) || 0;
    const data2 = parseFloat(availablePercentage) || 0;

    canvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Parcela do Financiamento', 'Renda Disponível'],
            datasets: [{
                data: [data1.toFixed(1), data2.toFixed(1)],
                backgroundColor: [commitmentColor, availableColor],
                borderColor: ['#ffffff', '#ffffff'],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });

    console.log("✅ Gráfico de Saúde Financeira criado!");
    return canvas.chart;
}

// Gráfico de Estatísticas (Statistics Chart)
function createStatisticsChartFixed(canvas) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não disponível para statisticsChart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    canvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Aprovadas', 'Em Análise', 'Pendentes', 'Rejeitadas'],
            datasets: [{
                data: [45, 25, 20, 10],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: '#fff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return context.label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    console.log("✅ Gráfico de Estatísticas criado!");
    return canvas.chart;
}

// Gráfico de Amortização (Amortization Chart)
function createAmortizationChartFixed(canvas) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não disponível para amortizationChart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior se existir
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // Gerar dados de exemplo para 12 meses
    const months = Array.from({length: 12}, (_, i) => `Mês ${i + 1}`);
    const principal = 50000;
    const rate = 0.015; // 1.5% ao mês
    
    let balance = principal;
    const balanceData = [];
    const interestData = [];
    const principalData = [];
    
    for (let i = 0; i < 12; i++) {
        const interest = balance * rate;
        const payment = principal * (rate * Math.pow(1 + rate, 60)) / (Math.pow(1 + rate, 60) - 1);
        const principalPayment = payment - interest;
        
        interestData.push(interest.toFixed(2));
        principalData.push(principalPayment.toFixed(2));
        balance -= principalPayment;
        balanceData.push(balance.toFixed(2));
    }

    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Saldo Devedor',
                    data: balanceData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Juros',
                    data: interestData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Amortização',
                    data: principalData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': R$ ' + 
                                   parseFloat(context.parsed.y).toLocaleString('pt-BR', {
                                       minimumFractionDigits: 2,
                                       maximumFractionDigits: 2
                                   });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });

    console.log("✅ Gráfico de Amortização criado!");
    return canvas.chart;
}

// Exportar funções globalmente para serem usadas pelo código original
window.createTimelineChartFixed = createTimelineChartFixed;
window.createHealthChartFixed = createHealthChartFixed;
window.createStatisticsChartFixed = createStatisticsChartFixed;
window.createAmortizationChartFixed = createAmortizationChartFixed;
window.initializeAllCharts = initializeAllCharts;

console.log("✅ Correção de gráficos aplicada com sucesso!");
console.log("📊 Funções disponíveis globalmente:");
console.log("   - createTimelineChartFixed()");
console.log("   - createHealthChartFixed()");
console.log("   - createStatisticsChartFixed()");
console.log("   - createAmortizationChartFixed()");
console.log("   - initializeAllCharts()");





    // Lógica para o botão FIPE
    const fipeLinkBtn = document.getElementById("fipeLinkBtn");
    if (fipeLinkBtn) {
        fipeLinkBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            // Verifica se a API do Tauri está disponível
            if (typeof window.__TAURI__ !== 'undefined' && typeof window.__TAURI__.shell !== 'undefined' && typeof window.__TAURI__.shell.open === 'function') {
                await window.__TAURI__.shell.open("https://placafipe.com.br/");
            } else {
                // Fallback para ambientes que não são Tauri (navegador normal)
                window.open('https://placafipe.com.br/', '_blank');
            }
        });
    }

    // Lógica para a nova tela inicial estilo App
    const updateWelcomeName = () => {
        const user = JSON.parse(localStorage.getItem("user"));
        const welcomeName = document.getElementById("welcomeUserName");
        if (welcomeName && user && user.name) {
            welcomeName.textContent = user.name.split(' ')[0];
        }
    };

    const toggleVisibilityBtn = document.getElementById("toggleVisibility");
    if (toggleVisibilityBtn) {
        toggleVisibilityBtn.addEventListener("click", () => {
            const balanceLabel = document.querySelector(".balance-label");
            const icon = toggleVisibilityBtn.querySelector("i");
            if (balanceLabel.textContent === "Acesse sua conta") {
                // Se quiser esconder valores reais no futuro, a lógica seria aqui
                balanceLabel.style.filter = balanceLabel.style.filter ? "" : "blur(5px)";
                icon.classList.toggle("fa-eye");
                icon.classList.toggle("fa-eye-slash");
            }
        });
    }

    // Inicializa o nome se já estiver logado
    updateWelcomeName();

    // Eventos para os novos botões da tela inicial
    const becomePartnerBtn = document.getElementById('becomePartnerBtn');
    if (becomePartnerBtn) {
        becomePartnerBtn.addEventListener('click', () => {
            if (typeof openRegisterModal === 'function') openRegisterModal();
        });
    }

    const registerBtnHeader = document.getElementById('registerBtnHeader');
    if (registerBtnHeader) {
        registerBtnHeader.addEventListener('click', () => {
            if (typeof openRegisterModal === 'function') openRegisterModal();
        });
    }

    // const headerProfileCircle = document.getElementById('headerProfileCircle');
    // if (headerProfileCircle) {
    //     headerProfileCircle.addEventListener('click', () => {
    //         const user = JSON.parse(localStorage.getItem("user"));
    //         if (user) {
    //             showPainel();
    //         } else {
    //             openLoginModal();
    //         }
    //     });
    // }

    // Ajuste para botões de serviço na tela inicial redirecionarem para login se necessário
    document.querySelectorAll('.app-content .service-painel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const user = JSON.parse(localStorage.getItem("user"));
            if (!user) {
                e.preventDefault();
                e.stopPropagation();
                localStorage.setItem("redirectAfterLogin", "painel");
                openLoginModal();
            }
        });
 
    // Lógica de privacidade unificada na função updateAllUserInfo e applyVisibilityState abaixo

    // ==========================================
    // 👤 LÓGICA DO PERFIL E CPF VISÍVEL
    // ==========================================
    const headerProfileCircle = document.getElementById('headerProfileCircle');
    const profileModal = document.getElementById('profileModal');

    function updateAllUserInfo() {
        const userStr = localStorage.getItem("user");
        
        const welcomeName = document.getElementById("welcomeUserName");
        const welcomeDoc = document.getElementById("welcomeUserDoc");
        const profileName = document.getElementById('profileNameDisplay');
        const profileEmail = document.getElementById('profileEmailDisplay');
        const profileDoc = document.getElementById('profileDocDisplay');
        const profilePhone = document.getElementById('profilePhoneDisplay');
        const profilePhoneInput = document.getElementById('profilePhoneInput');

        if (!userStr) {
            console.log("Nenhum usuário logado encontrado no localStorage.");
            if (welcomeName) welcomeName.textContent = "Parceiro";
            if (welcomeDoc) welcomeDoc.textContent = "---";
            if (profileName) profileName.textContent = "---";
            if (profileEmail) profileEmail.textContent = "---";
            if (profileDoc) profileDoc.textContent = "---";
            if (profilePhone) profilePhone.textContent = "---";
            return;
        }
        
        try {
            const user = JSON.parse(userStr);
            console.log("Dados do usuário carregados:", user);

            const cpfValue = user.cpf_cnpj || "---";
            const phoneValue = user.phone || "---";
            const fullName = user.name || "Parceiro";

            if (welcomeName) welcomeName.textContent = fullName.split(' ')[0];
            if (welcomeDoc) welcomeDoc.textContent = cpfValue;

            if (profileName) profileName.textContent = fullName;
            if (profileEmail) profileEmail.textContent = user.email || '---';
            if (profileDoc) profileDoc.textContent = cpfValue;
            if (profilePhone) profilePhone.textContent = phoneValue;
            if (profilePhoneInput) profilePhoneInput.value = phoneValue === "---" ? "" : phoneValue;

        } catch (e) {
            console.error("Erro ao processar dados do usuário:", e);
        }
        
        // ✅ CARREGAR FOTO DE PERFIL
        loadProfilePictureFromStorage();
    }

    const openProfile = () => {
        updateAllUserInfo();
        if (profileModal) {
            profileModal.classList.add('active');
            document.body.style.overflow = "hidden";
        }
    };

    if (headerProfileCircle) {
        headerProfileCircle.addEventListener('click', openProfile);
    }

    const shortcutProfileBtn = document.getElementById('shortcutProfileBtn');
    if (shortcutProfileBtn) {
        shortcutProfileBtn.addEventListener('click', openProfile);
    }

    // Botão Fechar do Perfil (X)
    if (profileModal) {
        const closeBtn = profileModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                profileModal.classList.remove('active');
                document.body.style.overflow = "auto";
            });
        }
    }

    // ==========================================
    // 🚪 LÓGICA DE SAIR DA CONTA (LOGOUT)
    // ==========================================
    const logoutBtnProfile = document.getElementById('logoutBtnProfile');
    if (logoutBtnProfile) {
        logoutBtnProfile.addEventListener('click', function(e) {
            e.preventDefault();
            // Limpa todos os dados de login
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("redirectAfterLogin");
            
            // Feedback visual e reinicia
            this.textContent = "Saindo...";
            
            // Fecha o modal de perfil antes de atualizar a UI
            if (profileModal) {
                profileModal.classList.remove('active');
                document.body.style.overflow = "auto";
            }
            
            // Atualiza a UI imediatamente antes de recarregar
            updateAllUserInfo();
            
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }

    // Inicializa as informações ao carregar a página
    updateAllUserInfo();
    
    // Carrega o feed do Instagram (Simulado para demonstração)
    const loadInstagramFeed = () => {
        const feed = document.getElementById('instagramFeed');
        if (!feed) return;
        
        // Em uma implementação real, usaríamos a API do Instagram ou um widget
        // Aqui estamos garantindo que a área seja visualmente atraente
        const posts = [
            { img: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&h=300&fit=crop', link: 'https://www.instagram.com/ccapifinanciamentos' },
            { img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=300&fit=crop', link: 'https://www.instagram.com/ccapifinanciamentos' },
            { img: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&h=300&fit=crop', link: 'https://www.instagram.com/ccapifinanciamentos' },
            { img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=300&h=300&fit=crop', link: 'https://www.instagram.com/ccapifinanciamentos' }
        ];
        
        feed.innerHTML = posts.map(post => `
            <a href="${post.link}" target="_blank" style="flex: 0 0 160px; aspect-ratio: 1/1; border-radius: 10px; overflow: hidden; scroll-snap-align: start; display: block;">
                <img src="${post.img}" alt="Instagram Post" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            </a>
        `).join('');
    };
    loadInstagramFeed();

    // ==========================================
    // 🏠 BUSCA AUTOMÁTICA DE CEP (ViaCEP)
    // ==========================================
    const setupCepAutomation = (cepInputId, addressInputId) => {
        const cepInput = document.getElementById(cepInputId);
        const addressInput = document.getElementById(addressInputId);
        
        if (!cepInput || !addressInput) return;
        
        cepInput.addEventListener('blur', async () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length !== 8) return;
            
            addressInput.value = "Buscando endereço...";
            addressInput.disabled = true;
            
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                
                if (data.erro) {
                    showNotification("CEP não encontrado", "error");
                    addressInput.value = "";
                } else {
                    addressInput.value = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                showNotification("Erro ao buscar CEP", "error");
                addressInput.value = "";
            } finally {
                addressInput.disabled = false;
            }
        });
    };

    setupCepAutomation('clientCepPF', 'clientAddressPF');
    setupCepAutomation('clientCepPJ', 'clientAddressPJ');

    // ==========================================
    // 🎭 MÁSCARAS AUTOMÁTICAS (CPF, DATA, TELEFONE)
    // ==========================================
    const applyMask = (input, maskType) => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            let formatted = '';

            if (maskType === 'cpf') {
                if (value.length > 11) value = value.slice(0, 11);
                if (value.length > 9) formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                else if (value.length > 6) formatted = value.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
                else if (value.length > 3) formatted = value.replace(/(\d{3})(\d{3})/, '$1.$2');
                else formatted = value;
            } else if (maskType === 'date') {
                if (value.length > 8) value = value.slice(0, 8);
                if (value.length > 4) formatted = value.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
                else if (value.length > 2) formatted = value.replace(/(\d{2})(\d{2})/, '$1/$2');
                else formatted = value;
            } else if (maskType === 'phone') {
                if (value.length > 11) value = value.slice(0, 11);
                if (value.length > 10) formatted = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                else if (value.length > 6) formatted = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                else if (value.length > 2) formatted = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                else formatted = value;
            } else if (maskType === 'plate') {
                // Placa Mercosul ou Antiga (ABC1234 ou ABC1D23)
                value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length > 7) value = value.slice(0, 7);
                formatted = value;
            }

            e.target.value = formatted;
        });
    };

    // Aplicar máscaras aos campos de filiação e outros
    const cpfFields = ['fatherCpf', 'motherCpf', 'spouseCpf', 'registerDocument'];
    const dateFields = ['fatherBirthDate', 'motherBirthDate', 'spouseBirthDate'];
    const phoneFields = ['registerPhone', 'profilePhoneInput'];
    const plateFields = ['searchPlate', 'vehiclePlate'];

    cpfFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) applyMask(el, 'cpf');
    });

    dateFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) applyMask(el, 'date');
    });

    phoneFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) applyMask(el, 'phone');
    });

    plateFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) applyMask(el, 'plate');
    });

    // ==========================================
    // 🔍 BUSCA DE PLACA (FIPE API)
    // ==========================================
    const btnSearchPlate = document.getElementById('btnSearchPlate');
    const inputSearchPlate = document.getElementById('searchPlate');

    if (btnSearchPlate && inputSearchPlate) {
        btnSearchPlate.addEventListener('click', async () => {
            const plate = inputSearchPlate.value.trim().toUpperCase();
            if (!plate) {
                alert('Por favor, digite uma placa.');
                return;
            }

            btnSearchPlate.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnSearchPlate.disabled = true;

            try {
                // Agora enviamos para a nossa própria API (PHP) para evitar problemas de CORS e usar o servidor como ponte
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'consulta_placa', placa: plate })
                });
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    const data = result.data;
                    
                    // Preenche os campos do formulário
                    if (document.getElementById('vehicleBrand')) document.getElementById('vehicleBrand').value = data.marca || '';
                    if (document.getElementById('vehicleModel')) document.getElementById('vehicleModel').value = data.modelo || '';
                    if (document.getElementById('vehiclePlate')) document.getElementById('vehiclePlate').value = plate;
                    
                    // Ano de fabricação e modelo
                    if (data.ano && document.getElementById('vehicleYearManufacture')) {
                         document.getElementById('vehicleYearManufacture').value = data.ano;
                    }
                    if (data.ano_modelo && document.getElementById('vehicleYearModel')) {
                         document.getElementById('vehicleYearModel').value = data.ano_modelo;
                    }

                    // Busca valor FIPE se disponível
                    if (data.fipe && data.fipe.dados && data.fipe.dados.length > 0) {
                        const fipeValue = data.fipe.dados[0].valor;
                        if (document.getElementById('vehicleValue')) document.getElementById('vehicleValue').value = fipeValue;
                    } else if (data.valor) {
                        if (document.getElementById('vehicleValue')) document.getElementById('vehicleValue').value = data.valor;
                    }

                    // Disparar evento de mudança para garantir que outros scripts vejam a alteração
                    ['vehicleBrand', 'vehicleModel', 'vehicleYearManufacture', 'vehicleYearModel', 'vehicleValue'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.dispatchEvent(new Event('change'));
                    });

                    showNotification('Dados do veículo carregados!', 'success');
                } else {
                    alert(result.error || 'Placa não encontrada ou erro na consulta. Verifique os dados.');
                }
            } catch (error) {
                console.error('Erro ao buscar placa:', error);
                alert('Erro na conexão com o servidor. Tente preencher manualmente.');
            } finally {
                btnSearchPlate.innerHTML = '<i class="fas fa-search"></i>';
                btnSearchPlate.disabled = false;
            }
        });
    }

    });

// ==========================================
// 📋 LÓGICA DE NOVA PROPOSTA (PF/PJ)
// ==========================================

function switchProposalTab(type) {
    const containerPF = document.getElementById('containerPF');
    const containerPJ = document.getElementById('containerPJ');
    const documentosPF = document.getElementById('documentosPF');
    const documentosPJ = document.getElementById('documentosPJ');
    const tabPF = document.getElementById('tabPF');
    const tabPJ = document.getElementById('tabPJ');
    const clientTypeInput = document.getElementById('clientType');

    if (type === 'PF') {
        containerPF.style.display = 'block';
        containerPJ.style.display = 'none';
        if (documentosPF) documentosPF.style.display = 'block';
        if (documentosPJ) documentosPJ.style.display = 'none';
        tabPF.classList.add('active-tab');
        tabPJ.classList.remove('active-tab');
        clientTypeInput.value = 'PF';
    } else {
        containerPF.style.display = 'none';
        containerPJ.style.display = 'block';
        if (documentosPF) documentosPF.style.display = 'none';
        if (documentosPJ) documentosPJ.style.display = 'block';
        tabPF.classList.remove('active-tab');
        tabPJ.classList.add('active-tab');
        clientTypeInput.value = 'PJ';
    }
}

let socioCount = 0;
function addSocio() {
    socioCount++;
    const container = document.getElementById('sociosContainer');
    const socioDiv = document.createElement('div');
    socioDiv.className = 'socio-item';
    socioDiv.id = `socio-${socioCount}`;
    socioDiv.style.border = '1px solid var(--gray-200)';
    socioDiv.style.padding = '15px';
    socioDiv.style.borderRadius = 'var(--border-radius)';
    socioDiv.style.marginBottom = '15px';
    socioDiv.style.position = 'relative';

    socioDiv.innerHTML = `
        <button type="button" onclick="removeSocio(${socioCount})" style="position: absolute; top: 10px; right: 10px; border: none; background: none; color: var(--danger-color); cursor: pointer;"><i class="fas fa-times"></i></button>
        <h4 style="margin-bottom: 10px; font-size: 0.9rem;">Sócio ${socioCount}</h4>
        <div class="form-grid">
            <div class="form-group"><label>Nome Completo</label><input type="text" name="socio_name[]"></div>
            <div class="form-group"><label>Email</label><input type="email" name="socio_email[]"></div>
            <div class="form-group"><label>Telefone</label><input type="tel" name="socio_phone[]"></div>
            <div class="form-group"><label>CPF</label><input type="text" name="socio_cpf[]" class="mask-cpf"></div>
            <div class="form-group"><label>Profissão</label><input type="text" name="socio_profession[]"></div>
            <div class="form-group"><label>Renda</label><input type="text" name="socio_income[]"></div>
        </div>
    `;
    container.appendChild(socioDiv);
    
    // Aplicar máscara ao novo campo de CPF
    const newCpf = socioDiv.querySelector('.mask-cpf');
    if (newCpf && typeof applyMask === 'function') applyMask(newCpf, 'cpf');
}

function removeSocio(id) {
    const socioDiv = document.getElementById(`socio-${id}`);
    if (socioDiv) socioDiv.remove();
}

// Tornar funções globais para serem chamadas pelo HTML
window.switchProposalTab = switchProposalTab;
window.addSocio = addSocio;
window.removeSocio = removeSocio;

// ==========================================
// 🎧 LÓGICA DE SUPORTE TÉCNICO
// ==========================================

const supportForm = document.getElementById('supportForm');
const supportMessages = document.getElementById('supportMessages');
const supportInput = document.getElementById('supportMessageInput');

if (supportForm) {
    console.log("✅✅✅ SUPPORT FORM ENCONTRADO E PRONTO!");
    console.log("   - Form:", supportForm);
    console.log("   - Messages:", supportMessages);
    console.log("   - Input:", supportInput);
    
    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = supportInput.value.trim();
        const user = JSON.parse(localStorage.getItem('user'));

        console.log("📤 Enviando mensagem de suporte:", message);
        console.log("👤 Usuário:", user);

        if (!message) {
            console.warn("⚠️ Mensagem vazia");
            return;
        }
        if (!user) {
            showNotification('Faça login para usar o suporte', 'error');
            return;
        }

        // EXIBIR MENSAGEM NA TELA IMEDIATAMENTE
        appendSupportMessage('user', message);
        supportInput.value = "";

        try {
            console.log("🔗 Enviando para API:", API_URL);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_support_message',
                    user_id: user.id,
                    message: message,
                    ticket_id: currentTicketId
                })
            });

            console.log("📥 Resposta recebida:", response.status);
            const result = await response.json();
            console.log("📋 Resultado:", result);
            
            if (result.success) {
                currentTicketId = result.data.ticket_id;
                console.log("✅ Ticket ID:", currentTicketId);
                
                // Iniciar timer na primeira mensagem
                if (!supportChatStartTime) {
                    supportChatStartTime = Date.now();
                    startSupportChatTimer();
                }
                // Simular resposta automática
                setTimeout(() => {
                    appendSupportMessage('system', 'Sua mensagem foi enviada para nossa equipe técnica. Em breve entraremos em contato pelo seu email ou chat.');
                }, 1000);
            } else {
                console.error("❌ Erro na resposta:", result.error);
                showNotification('Erro ao enviar mensagem: ' + (result.error || 'Desconhecido'), 'error');
            }
        } catch (error) {
            console.error('❌ Erro no suporte:', error);
            console.error('Detalhes:', error.message);
            showNotification('Erro de conexão com o servidor: ' + error.message, 'error');
        }
    });
} else {
    console.error("❌ Support form NÃO encontrado!");
}

function appendSupportMessage(type, text) {
    console.log("💬 Adicionando mensagem de suporte:", type, text);
    if (!supportMessages) {
        console.error("❌ supportMessages não encontrado!");
        return;
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<p>${text}</p>`;
    supportMessages.appendChild(msgDiv);
    supportMessages.scrollTop = supportMessages.scrollHeight;
    console.log("✅ Mensagem adicionada com sucesso");
}

// Carregar histórico de suporte (opcional)
async function loadSupportHistory(userId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'listar_suporte', user_id: userId })
        });
        const result = await response.json();
        if (result.success && result.data) {
            result.data.forEach(msg => {
                appendSupportMessage(msg.type, msg.message);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar suporte:', error);
    }
}


// ===== CHAT COM ESPECIALISTAS =====
function openSpecialistChat(specialistName, color) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Verificar se usuário está logado
    if (!user || !user.id) {
        showNotification('Faça login para conversar com especialistas', 'error');
        openLoginModal();
        return;
    }
    
    // Criar ID único para a conversa
    const conversationId = `specialist_${specialistName.toLowerCase()}_${user.id}`;
    
    // Armazenar dados da conversa atual
    localStorage.setItem('currentSpecialist', specialistName);
    localStorage.setItem('currentConversationId', conversationId);
    
    // Mostrar interface de chat
    showSpecialistChatWindow(specialistName, color);
    
    // Carregar histórico de mensagens (se houver)
    loadSpecialistMessages(conversationId);
}

function showSpecialistChatWindow(specialistName, color) {
    // Criar modal de chat ou mostrar janela de chat
    const chatWindow = document.createElement('div');
    chatWindow.id = 'specialistChatWindow';
    chatWindow.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 5px 40px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        z-index: 10000;
    `;
    
    chatWindow.innerHTML = `
        <div style="background: ${color}; padding: 15px; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 12px 12px 0 0;">
            <h4 style="margin: 0; font-size: 16px; font-weight: 600;">Chat com ${specialistName}</h4>
            <button onclick="closeSpecialistChat()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
        </div>
        
        <div id="specialistMessages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f5f5f5;">
            <p style="text-align: center; color: #999; margin-top: 20px;">Comece a conversa com ${specialistName}</p>
        </div>
        
        <div style="padding: 15px; border-top: 1px solid #eee; display: flex; gap: 10px;">
            <input type="text" id="specialistMessageInput" placeholder="Digite sua mensagem..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
            <button onclick="sendSpecialistMessage()" style="background: ${color}; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">Enviar</button>
        </div>
    `;
    
    // Remover chat anterior se existir
    const oldChat = document.getElementById('specialistChatWindow');
    if (oldChat) oldChat.remove();
    
    // Adicionar novo chat
    document.body.appendChild(chatWindow);
    
    // Focar no input
    setTimeout(() => {
        document.getElementById('specialistMessageInput').focus();
    }, 100);
}

function closeSpecialistChat() {
    const chatWindow = document.getElementById('specialistChatWindow');
    if (chatWindow) chatWindow.remove();
    localStorage.removeItem('currentSpecialist');
    localStorage.removeItem('currentConversationId');
}

function sendSpecialistMessage() {
    const input = document.getElementById('specialistMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const specialist = localStorage.getItem('currentSpecialist');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!specialist || !user) return;
    
    // EXIBIR MENSAGEM IMEDIATAMENTE NA TELA
    addSpecialistMessageToChat('user', message, user.name || 'Você');
    
    // Limpar input
    input.value = '';
    
    // Salvar mensagem localmente
    const conversationId = `specialist_${specialist.toLowerCase()}_${user.id}`;
    const messages = JSON.parse(localStorage.getItem(`chat_${conversationId}`) || '[]');
    messages.push({
        sender: 'user',
        message: message,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(`chat_${conversationId}`, JSON.stringify(messages));
    
    // Tentar enviar para o servidor (em background)
    fetch(API_URL || 'api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'send_specialist_message',
            user_id: user.id,
            specialist: specialist,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Mensagem salva no banco de dados');
        }
    })
    .catch(error => {
        console.warn('Mensagem exibida localmente, mas falhou ao salvar no servidor:', error);
    });
    
    // Simular resposta do especialista após 2 segundos
    setTimeout(() => {
        const responses = {
            'Fabricio': 'Obrigado pela sua pergunta! Vou analisar sua solicitação e retornar em breve com as melhores opções de financiamento para você.',
            'Neto': 'Entendi! Vou verificar sua proposta e enviar as informações necessárias. Você receberá uma atualização em breve.',
            'Wandreyna': 'Ótimo! Vou fazer uma simulação detalhada para você. Aguarde alguns momentos...',
            'Edér': 'Perfeito! Vou analisar as opções de quitação antecipada mais vantajosas para seu caso.',
            'Suzana': 'Claro! Estou aqui para ajudar. Vou resolver sua dúvida o mais rápido possível.'
        };
        
        const response = responses[specialist] || 'Obrigado pela mensagem! Em breve retornaremos com uma resposta.';
        addSpecialistMessageToChat('specialist', response, specialist);
        
        // Salvar resposta localmente
        messages.push({
            sender: 'specialist',
            message: response,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(`chat_${conversationId}`, JSON.stringify(messages));
    }, 2000);
}

function addSpecialistMessageToChat(sender, message, name) {
    const messagesContainer = document.getElementById('specialistMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        ${sender === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;
    
    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
        max-width: 80%;
        padding: 10px 12px;
        border-radius: 12px;
        word-wrap: break-word;
        font-size: 14px;
        ${sender === 'user' 
            ? 'background: #667eea; color: white; border-radius: 18px 18px 4px 18px;' 
            : 'background: white; color: #333; border: 1px solid #ddd; border-radius: 18px 18px 18px 4px;'}
    `;
    messageBubble.textContent = message;
    
    messageDiv.appendChild(messageBubble);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll para o final
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function loadSpecialistMessages(conversationId) {
    const messages = JSON.parse(localStorage.getItem(`chat_${conversationId}`) || '[]');
    const messagesContainer = document.getElementById('specialistMessages');
    
    if (!messagesContainer) return;
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = '<p style="text-align: center; color: #999; margin-top: 20px;">Comece a conversa</p>';
        return;
    }
    
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        addSpecialistMessageToChat(msg.sender, msg.message, msg.sender === 'user' ? 'Você' : 'Especialista');
    });
}


// ===== TIMER DE 10 MINUTOS PARA CHAT DE SUPORTE =====
function startSupportChatTimer() {
    supportChatTimer = setInterval(() => {
        const elapsed = Date.now() - supportChatStartTime;
        const tenMinutes = 10 * 60 * 1000;
        
        if (elapsed >= tenMinutes) {
            // Mostrar botao de encerrar conversa
            showSupportCloseButton();
            clearInterval(supportChatTimer);
        }
    }, 1000);
}

function showSupportCloseButton() {
    const supportSection = document.getElementById('support');
    if (!supportSection) return;
    
    // Verificar se botao ja existe\n    if (document.getElementById('closeSupportChatBtn')) return;
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'closeSupportChatBtn';
    closeBtn.className = 'btn btn-danger';
    closeBtn.style.cssText = 'margin-top: 15px; width: 100%; padding: 10px; background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;';
    closeBtn.innerHTML = '<i class=\"fas fa-times\"></i> Encerrar Conversa';
    closeBtn.onclick = closeSupportChat;
    
    const supportForm = document.getElementById('supportForm');
    if (supportForm && supportForm.parentNode) {
        supportForm.parentNode.insertBefore(closeBtn, supportForm.nextSibling);
    }
}

function closeSupportChat() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !currentTicketId) return;
    
    // Confirmar encerramento
    if (!confirm('Tem certeza que deseja encerrar esta conversa? O historico sera deletado.')) {
        return;
    }
    
    // Enviar requisicao para fechar ticket
    fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'close_support_ticket',
            ticket_id: currentTicketId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Limpar chat
            const supportMessages = document.getElementById('supportMessages');
            if (supportMessages) {
                supportMessages.innerHTML = '<p class=\"no-data\">Conversa encerrada. Obrigado por usar nosso suporte!</p>';
            }
            
            // Remover botao de fechar
            const closeBtn = document.getElementById('closeSupportChatBtn');
            if (closeBtn) closeBtn.remove();
            
            // Resetar variaveis
            supportChatStartTime = null;
            currentTicketId = null;
            if (supportChatTimer) clearInterval(supportChatTimer);
            
            showNotification('Conversa encerrada com sucesso', 'success');
        } else {
            showNotification('Erro ao encerrar conversa', 'error');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        showNotification('Erro de conexao', 'error');
    });
    // ==========================================
// CORREÇÃO: FUNÇÃO DE LOGOUT
// ==========================================
function logoutUser() {
    // Salvar dados em cache antes de limpar
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        try {
            localStorage.setItem('last_user', JSON.stringify(user));
        } catch (e) {}
    }
    
    // Limpar dados de login
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("redirectAfterLogin");
    
    // Resetar interface da tela inicial
    const welcomeName = document.getElementById("welcomeUserName");
    const welcomeDoc = document.getElementById("welcomeUserDoc");
    
    if (welcomeName) welcomeName.textContent = "Visitante";
    if (welcomeDoc) welcomeDoc.textContent = "---";
    
    // Fechar painel se estiver aberto
    const dashboard = document.getElementById("dashboard");
    if (dashboard) {
        dashboard.style.display = "none";
        dashboard.classList.remove("active");
        document.body.style.overflow = "";
    }
    
    // Fechar modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => modal.classList.remove('active'));
    
    // Mostrar notificação
    if (typeof showNotification === 'function') {
        showNotification("👋 Até logo! Você saiu da sua conta.", "info");
    }
    
    // Recarregar a página após 1 segundo para resetar tudo
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// ==========================================
// CORREÇÃO: BOTÃO ACESSAR PAINEL
// ==========================================
function fixDashboardButton() {
    const accessDashboardBtn = document.getElementById('accessDashboardBtn');
    if (accessDashboardBtn) {
        // Remover listeners antigos
        const newBtn = accessDashboardBtn.cloneNode(true);
        accessDashboardBtn.parentNode.replaceChild(newBtn, accessDashboardBtn);
        
        // Adicionar novo listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.id) {
                // Usuário logado - abrir painel
                if (typeof showDashboard === 'function') {
                    showDashboard();
                } else {
                    document.getElementById('dashboard').style.display = 'flex';
                }
            } else {
                // Não logado - abrir login
                localStorage.setItem("redirectAfterLogin", "dashboard");
                if (typeof openLoginModal === 'function') {
                    openLoginModal();
                } else {
                    document.getElementById('loginModal').classList.add('active');
                }
            }
        });
    }
}

// ==========================================
// CORREÇÃO: BOTÃO MINHA CONTA
// ==========================================
function fixProfileButtons() {
    // Botão do círculo no header
    const headerProfile = document.getElementById('headerProfileCircle');
    if (headerProfile) {
        const newHeader = headerProfile.cloneNode(true);
        headerProfile.parentNode.replaceChild(newHeader, headerProfile);
        
        newHeader.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.id) {
                if (typeof openProfileModal === 'function') {
                    openProfileModal();
                } else {
                    document.getElementById('profileModal').classList.add('active');
                }
                updateProfileInfo();
            } else {
                if (typeof openLoginModal === 'function') {
                    openLoginModal();
                } else {
                    document.getElementById('loginModal').classList.add('active');
                }
            }
        });
    }
    
    // Shortcut Minha Conta
    const shortcutProfile = document.getElementById('shortcutProfileBtn');
    if (shortcutProfile) {
        const newShortcut = shortcutProfile.cloneNode(true);
        shortcutProfile.parentNode.replaceChild(newShortcut, shortcutProfile);
        
        newShortcut.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user && user.id) {
                if (typeof openProfileModal === 'function') {
                    openProfileModal();
                } else {
                    document.getElementById('profileModal').classList.add('active');
                }
                updateProfileInfo();
            } else {
                if (typeof openLoginModal === 'function') {
                    openLoginModal();
                } else {
                    document.getElementById('loginModal').classList.add('active');
                }
            }
        });
    }
}

// ==========================================
// CORREÇÃO: ATUALIZAR INFORMAÇÕES DO USUÁRIO
// ==========================================
function updateProfileInfo() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    
    try {
        const user = JSON.parse(userStr);
        
        // Atualizar nome no header
        const welcomeName = document.getElementById("welcomeUserName");
        if (welcomeName) {
            welcomeName.textContent = user.name ? user.name.split(' ')[0] : "Parceiro";
        }
        
        // Atualizar documento no header
        const welcomeDoc = document.getElementById("welcomeUserDoc");
        if (welcomeDoc) {
            welcomeDoc.textContent = user.cpf_cnpj || "---";
        }
        
        // Atualizar modal de perfil
        const profileName = document.getElementById('profileNameDisplay');
        const profileEmail = document.getElementById('profileEmailDisplay');
        const profileDoc = document.getElementById('profileDocDisplay');
        const profilePhone = document.getElementById('profilePhoneDisplay');
        
        if (profileName) profileName.textContent = user.name || "---";
        if (profileEmail) profileEmail.textContent = user.email || "---";
        if (profileDoc) profileDoc.textContent = user.cpf_cnpj || "---";
        if (profilePhone) profilePhone.textContent = user.phone || "---";
        
    } catch (e) {
        console.error("Erro ao atualizar perfil:", e);
    }
}

// ==========================================
// CORREÇÃO: CEP AUTOMÁTICO
// ==========================================
function setupCEPAutomatico() {
    // CEP para PF
    const cepPF = document.getElementById('clientCepPF');
    if (cepPF) {
        cepPF.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep, 'clientAddressPF');
            }
        });
    }
    
    // CEP para PJ
    const cepPJ = document.getElementById('clientCepPJ');
    if (cepPJ) {
        cepPJ.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep, 'clientAddressPJ');
            }
        });
    }
}

function buscarCEP(cep, campoEndereco) {
    const enderecoField = document.getElementById(campoEndereco);
    if (!enderecoField) return;
    
    enderecoField.value = "Buscando...";
    
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => response.json())
        .then(data => {
            if (!data.erro) {
                const logradouro = data.logradouro || '';
                const bairro = data.bairro || '';
                const cidade = data.localidade || '';
                const uf = data.uf || '';
                
                let enderecoCompleto = [];
                if (logradouro) enderecoCompleto.push(logradouro);
                if (bairro) enderecoCompleto.push(bairro);
                if (cidade && uf) enderecoCompleto.push(`${cidade} - ${uf}`);
                
                enderecoField.value = enderecoCompleto.join(', ');
                
                if (typeof showNotification === 'function') {
                    showNotification('✅ Endereço preenchido!', 'success');
                }
            } else {
                enderecoField.value = '';
                if (typeof showNotification === 'function') {
                    showNotification('CEP não encontrado', 'error');
                }
            }
        })
        .catch(() => {
            enderecoField.value = '';
            if (typeof showNotification === 'function') {
                showNotification('Erro ao buscar CEP', 'error');
            }
        });
}

// ==========================================
// CORREÇÃO: CAMPOS DE ANO (1990-2030)
// ==========================================
function fixYearSelects() {
    const anoFabricacao = document.getElementById('vehicleYearManufacture');
    const anoModelo = document.getElementById('vehicleYearModel');
    
    if (anoFabricacao) {
        // Manter o valor selecionado se existir
        const valorAtual = anoFabricacao.value;
        anoFabricacao.innerHTML = '<option value="">Selecione</option>';
        
        for (let ano = 2030; ano >= 1990; ano--) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            if (valorAtual == ano) option.selected = true;
            anoFabricacao.appendChild(option);
        }
    }
    
    if (anoModelo) {
        const valorAtual = anoModelo.value;
        anoModelo.innerHTML = '<option value="">Selecione</option>';
        
        for (let ano = 2030; ano >= 1990; ano--) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            if (valorAtual == ano) option.selected = true;
            anoModelo.appendChild(option);
        }
    }
}

// ==========================================
// CORREÇÃO: CAMPO CPF NO PJ
// ==========================================
function fixPJFields() {
    const labelCPF = document.querySelector('label[for="clientDocumentPJ"]');
    if (labelCPF) {
        labelCPF.textContent = "CPF:";
    }
    
    const inputCPF = document.getElementById('clientDocumentPJ');
    if (inputCPF) {
        inputCPF.placeholder = "000.000.000-00";
    }
}

// ==========================================
// CORREÇÃO: BOTÃO SALVAR RASCUNHO
// ==========================================
function setupDraftButton() {
    const saveDraftBtn = document.querySelector('.btn-outline');
    if (saveDraftBtn && saveDraftBtn.textContent.includes('Salvar Rascunho')) {
        saveDraftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveProposalDraft();
        });
    }
}

function saveProposalDraft() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        if (typeof showNotification === 'function') {
            showNotification('Faça login para salvar rascunho', 'warning');
        }
        return;
    }
    
    const draftData = {
        user_id: user.id,
        timestamp: Date.now(),
        clientType: document.getElementById('clientType')?.value || 'PF',
        data: {}
    };
    
    // Salvar campos PF
    const pfFields = ['clientNamePF', 'clientCpfPF', 'clientBirthDatePF', 'clientPhonePF', 
                     'clientEmailPF', 'clientCepPF', 'clientAddressPF', 'motherNamePF', 'fatherNamePF'];
    pfFields.forEach(field => {
        const el = document.getElementById(field);
        if (el) draftData.data[field] = el.value;
    });
    
    // Salvar campos PJ
    const pjFields = ['clientNamePJ', 'clientCnpjPJ', 'clientBirthDatePJ', 'clientPhonePJ',
                     'clientEmailPJ', 'clientCepPJ', 'clientAddressPJ', 'clientDocumentPJ'];
    pjFields.forEach(field => {
        const el = document.getElementById(field);
        if (el) draftData.data[field] = el.value;
    });
    
    // Salvar veículo
    const vehicleFields = ['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYearManufacture',
                          'vehicleYearModel', 'vehiclePlate', 'vehicleValue', 'vehicleCondition'];
    vehicleFields.forEach(field => {
        const el = document.getElementById(field);
        if (el) draftData.data[field] = el.value;
    });
    
    // Salvar financiamento
    const financeFields = ['financeValue', 'downPayment', 'financeType', 'specialist', 'proposalNotes'];
    financeFields.forEach(field => {
        const el = document.getElementById(field);
        if (el) draftData.data[field] = el.value;
    });
    
    try {
        localStorage.setItem('proposal_draft', JSON.stringify(draftData));
        if (typeof showNotification === 'function') {
            showNotification('✅ Rascunho salvo!', 'success');
        }
    } catch (e) {
        if (typeof showNotification === 'function') {
            showNotification('Erro ao salvar rascunho', 'error');
        }
    }
}

function loadProposalDraft() {
    const draft = localStorage.getItem('proposal_draft');
    if (!draft) return;
    
    try {
        const draftData = JSON.parse(draft);
        
        // Restaurar tipo de cliente
        if (draftData.clientType) {
            if (typeof switchProposalTab === 'function') {
                switchProposalTab(draftData.clientType);
            }
        }
        
        // Restaurar campos
        Object.keys(draftData.data).forEach(field => {
            const el = document.getElementById(field);
            if (el) el.value = draftData.data[field];
        });
        
        if (typeof showNotification === 'function') {
            showNotification('📝 Rascunho carregado!', 'info');
        }
    } catch (e) {
        console.error('Erro ao carregar rascunho:', e);
    }
}

// ==========================================
// CORREÇÃO: CHAT COM ESPECIALISTAS (CORES)
// ==========================================
function fixChatCards() {
    const cards = document.querySelectorAll('.specialist-chat-box');
    
    const cores = [
        { bg: 'linear-gradient(135deg, #6B8CFF, #4A6FE3)', color: 'white' }, // Fabrício - Azul
        { bg: 'linear-gradient(135deg, #36D1DC, #5B86E5)', color: 'white' }, // Neto - Verde Água
        { bg: 'linear-gradient(135deg, #9796F0, #FBC7D1)', color: 'white' }, // Wandreyna - Roxo
        { bg: 'linear-gradient(135deg, #2C3E50, #3498DB)', color: 'white' }, // Edér - Azul Petróleo
        { bg: 'linear-gradient(135deg, #FAD0C4, #FFD1FF)', color: '#2C3E50' } // Suzana - Rosa
    ];
    
    cards.forEach((card, index) => {
        if (index < cores.length) {
            card.style.background = cores[index].bg;
            card.style.color = cores[index].color;
            
            // Corrigir botões
            const btn = card.querySelector('.btn-primary');
            if (btn) {
                btn.style.background = 'white';
                btn.style.color = cores[index].color === 'white' ? '#2C3E50' : cores[index].color;
            }
        }
    });
}

// ==========================================
// INICIALIZAR CORREÇÕES
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Aplicando correções...');
    
    // Corrigir botões
    fixDashboardButton();
    fixProfileButtons();
    
    // Configurar CEP automático
    setupCEPAutomatico();
    
    // Corrigir anos
    fixYearSelects();
    
    // Corrigir campo CPF no PJ
    fixPJFields();
    
    // Configurar botão de rascunho
    setupDraftButton();
    
    // Carregar rascunho se existir
    loadProposalDraft();
    
    // Corrigir cores dos cards de chat
    fixChatCards();
    
    // Atualizar informações do usuário
    updateProfileInfo();
    
    // Verificar se usuário está logado
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        updateProfileInfo();
    }
    
    console.log('✅ Correções aplicadas!');
});

// ==========================================
// 🚀 CORREÇÕES FINAIS - TELA INICIAL E LOGOUT
// ==========================================

// Garantir que o botão "Acessar Painel" funcione sempre
function garantirBotaoPainel() {
    const btnAcessar = document.getElementById('accessDashboardBtn');
    if (btnAcessar) {
        // Remover todos os listeners antigos clonando e substituindo
        const novoBtn = btnAcessar.cloneNode(true);
        btnAcessar.parentNode.replaceChild(novoBtn, btnAcessar);
        
        novoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.id) {
                // Usuário logado - abrir painel
                const painel = document.getElementById('dashboard');
                if (painel) {
                    painel.style.display = 'flex';
                    painel.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // Atualizar nome no painel
                    const userName = document.getElementById('userName');
                    if (userName) userName.textContent = user.name?.split(' ')[0] || 'Parceiro';
                    
                    // Carregar dados
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData(user.id);
                    }
                }
            } else {
                // Não logado - abrir login
                localStorage.setItem('redirectAfterLogin', 'dashboard');
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });
        console.log('✅ Botão Acessar Painel corrigido');
    }
}

// Garantir que o botão "Minha Conta" funcione sempre
function garantirBotaoPerfil() {
    // Botão do círculo no header
    const btnPerfil = document.getElementById('headerProfileCircle');
    if (btnPerfil) {
        const novoBtn = btnPerfil.cloneNode(true);
        btnPerfil.parentNode.replaceChild(novoBtn, btnPerfil);
        
        novoBtn.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.id) {
                // Abrir modal de perfil
                const modalPerfil = document.getElementById('profileModal');
                if (modalPerfil) {
                    // Atualizar informações antes de abrir
                    const nome = document.getElementById('profileNameDisplay');
                    const email = document.getElementById('profileEmailDisplay');
                    const doc = document.getElementById('profileDocDisplay');
                    const phone = document.getElementById('profilePhoneDisplay');
                    
                    if (nome) nome.textContent = user.name || '---';
                    if (email) email.textContent = user.email || '---';
                    if (doc) doc.textContent = user.cpf_cnpj || '---';
                    if (phone) phone.textContent = user.phone || '---';
                    
                    modalPerfil.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                // Abrir login
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });
        console.log('✅ Botão Minha Conta corrigido');
    }
    
    // Shortcut "Minha Conta" no card
    const shortcut = document.getElementById('shortcutProfileBtn');
    if (shortcut) {
        const novoShortcut = shortcut.cloneNode(true);
        shortcut.parentNode.replaceChild(novoShortcut, shortcut);
        
        novoShortcut.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && user.id) {
                const modalPerfil = document.getElementById('profileModal');
                if (modalPerfil) {
                    const nome = document.getElementById('profileNameDisplay');
                    const email = document.getElementById('profileEmailDisplay');
                    const doc = document.getElementById('profileDocDisplay');
                    const phone = document.getElementById('profilePhoneDisplay');
                    
                    if (nome) nome.textContent = user.name || '---';
                    if (email) email.textContent = user.email || '---';
                    if (doc) doc.textContent = user.cpf_cnpj || '---';
                    if (phone) phone.textContent = user.phone || '---';
                    
                    modalPerfil.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                const loginModal = document.getElementById('loginModal');
                if (loginModal) {
                    loginModal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            }
        });
    }
}

// Sobrescrever a função de logout para garantir que funcione
function logoutUsuario() {
    // Limpar dados
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('redirectAfterLogin');
    
    // Atualizar interface
    const welcomeName = document.getElementById('welcomeUserName');
    const welcomeDoc = document.getElementById('welcomeUserDoc');
    const profileName = document.getElementById('profileNameDisplay');
    const profileEmail = document.getElementById('profileEmailDisplay');
    const profileDoc = document.getElementById('profileDocDisplay');
    const profilePhone = document.getElementById('profilePhoneDisplay');
    
    if (welcomeName) welcomeName.textContent = 'Visitante';
    if (welcomeDoc) welcomeDoc.textContent = '---';
    if (profileName) profileName.textContent = 'Não logado';
    if (profileEmail) profileEmail.textContent = '---';
    if (profileDoc) profileDoc.textContent = '---';
    if (profilePhone) profilePhone.textContent = '---';
    
    // Fechar painel
    const painel = document.getElementById('dashboard');
    if (painel) {
        painel.style.display = 'none';
        painel.classList.remove('active');
    }
    
    // Fechar modais
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    document.body.style.overflow = '';
    
    // Mostrar notificação
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = '👋 Até logo! Você saiu da sua conta.';
        notification.className = 'notification info show';
        setTimeout(() => notification.classList.remove('show'), 3000);
    }
    
    console.log('✅ Logout realizado');
}

// Garantir que o botão de logout no perfil funcione
function garantirBotaoLogout() {
    const btnLogout = document.getElementById('logoutBtnProfile');
    if (btnLogout) {
        const novoBtn = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(novoBtn, btnLogout);
        
        novoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUsuario();
            
            // Recarregar após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        });
        console.log('✅ Botão Logout corrigido');
    }
}

// Garantir CEP automático
function garantirCEPAutomatico() {
    // PF
    const cepPF = document.getElementById('clientCepPF');
    const enderecoPF = document.getElementById('clientAddressPF');
    if (cepPF && enderecoPF) {
        cepPF.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                enderecoPF.value = 'Buscando...';
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.erro) {
                            const partes = [];
                            if (data.logradouro) partes.push(data.logradouro);
                            if (data.bairro) partes.push(data.bairro);
                            if (data.localidade && data.uf) partes.push(`${data.localidade} - ${data.uf}`);
                            enderecoPF.value = partes.join(', ');
                            
                            const notification = document.getElementById('notification');
                            if (notification) {
                                notification.textContent = '✅ Endereço preenchido!';
                                notification.className = 'notification success show';
                                setTimeout(() => notification.classList.remove('show'), 3000);
                            }
                        } else {
                            enderecoPF.value = '';
                        }
                    })
                    .catch(() => {
                        enderecoPF.value = '';
                    });
            }
        });
    }
    
    // PJ
    const cepPJ = document.getElementById('clientCepPJ');
    const enderecoPJ = document.getElementById('clientAddressPJ');
    if (cepPJ && enderecoPJ) {
        cepPJ.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                enderecoPJ.value = 'Buscando...';
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.erro) {
                            const partes = [];
                            if (data.logradouro) partes.push(data.logradouro);
                            if (data.bairro) partes.push(data.bairro);
                            if (data.localidade && data.uf) partes.push(`${data.localidade} - ${data.uf}`);
                            enderecoPJ.value = partes.join(', ');
                        } else {
                            enderecoPJ.value = '';
                        }
                    })
                    .catch(() => {
                        enderecoPJ.value = '';
                    });
            }
        });
    }
    console.log('✅ CEP automático configurado');
}

// Garantir anos 1990-2030
function garantirAnos() {
    const anoFabricacao = document.getElementById('vehicleYearManufacture');
    const anoModelo = document.getElementById('vehicleYearModel');
    
    if (anoFabricacao) {
        const atual = anoFabricacao.value;
        anoFabricacao.innerHTML = '<option value="">Selecione</option>';
        for (let ano = 2030; ano >= 1990; ano--) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            if (atual == ano) option.selected = true;
            anoFabricacao.appendChild(option);
        }
    }
    
    if (anoModelo) {
        const atual = anoModelo.value;
        anoModelo.innerHTML = '<option value="">Selecione</option>';
        for (let ano = 2030; ano >= 1990; ano--) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            if (atual == ano) option.selected = true;
            anoModelo.appendChild(option);
        }
    }
    console.log('✅ Anos 1990-2030 configurados');
}

// Garantir campo CPF no PJ
function garantirCampoCPF() {
    const label = document.querySelector('label[for="clientDocumentPJ"]');
    if (label) label.textContent = 'CPF:';
    
    const input = document.getElementById('clientDocumentPJ');
    if (input) input.placeholder = '000.000.000-00';
}

// Garantir cards de chat com cores melhores
function garantirCoresChat() {
    const cards = document.querySelectorAll('.specialist-chat-box');
    const cores = [
        'linear-gradient(135deg, #1e3a8a, #3b82f6)', // Fabrício - Azul escuro
        'linear-gradient(135deg, #0891b2, #06b6d4)', // Neto - Azul claro
        'linear-gradient(135deg, #6b21a5, #a855f7)', // Wandreyna - Roxo
        'linear-gradient(135deg, #115e59, #14b8a6)', // Edér - Verde água
        'linear-gradient(135deg, #b45309, #f59e0b)'  // Suzana - Laranja
    ];
    
    cards.forEach((card, index) => {
        if (index < cores.length) {
            card.style.background = cores[index];
            card.style.color = 'white';
            
            const btn = card.querySelector('.btn-primary');
            if (btn) {
                btn.style.background = 'white';
                btn.style.color = '#333';
            }
        }
    });
}

// ==========================================
// 🚀 EXECUTAR CORREÇÕES APÓS O CARREGAMENTO
// ==========================================
setTimeout(() => {
    garantirBotaoPainel();
    garantirBotaoPerfil();
    garantirBotaoLogout();
    garantirCEPAutomatico();
    garantirAnos();
    garantirCampoCPF();
    garantirCoresChat();
    
    // Verificar se usuário está logado e atualizar interface
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const welcomeName = document.getElementById('welcomeUserName');
        const welcomeDoc = document.getElementById('welcomeUserDoc');
        if (welcomeName) welcomeName.textContent = user.name?.split(' ')[0] || 'Parceiro';
        if (welcomeDoc) welcomeDoc.textContent = user.cpf_cnpj || '---';
    }
    
    console.log('✅ Todas as correções aplicadas com sucesso!');
}, 500);
}

    // ============================================================
    // PERSISTÊNCIA AUTOMÁTICA DE DADOS DO FORMULÁRIO
    // ============================================================
    const autoSaveFormData = () => {
        const formInputs = document.querySelectorAll('#proposalForm input, #proposalForm select, #proposalForm textarea');
        formInputs.forEach(input => {
            input.addEventListener('change', () => {
                const draftData = getProposalFormData();
                localStorage.setItem("proposal_draft", JSON.stringify(draftData));
                console.log("✅ Rascunho salvo automaticamente");
            });
        });
    };
    
    // Chamar ao carregar a aba de novas propostas
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(sectionId) {
        originalSwitchTab(sectionId);
        if (sectionId === 'new-proposal') {
            setTimeout(() => {
                autoSaveFormData();
                // Restaurar rascunho se existir
                const draft = localStorage.getItem("proposal_draft");
                if (draft) {
                    const draftData = JSON.parse(draft);
                    Object.keys(draftData).forEach(key => {
                        const element = document.getElementById(key);
                        if (element) {
                            element.value = draftData[key] || '';
                        }
                    });
                    console.log("✅ Rascunho restaurado");
                }
            }, 300);
        }
    };

    // ============================================================
    // SUB-ABA DE EDIÇÃO DE PROPOSTAS
    // ============================================================
    window.editProposal = function(proposalId) {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
            showNotification("Faça login para editar propostas", "error");
            return;
        }
        
        // Buscar dados da proposta
        fetch(API_URL + '?action=get_proposal&proposal_id=' + proposalId)
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data) {
                    const proposal = res.data;
                    
                    // Preencher o formulário com os dados
                    document.getElementById('clientType').value = proposal.client_type || 'PF';
                    document.getElementById('clientNamePF').value = proposal.client_name || '';
                    document.getElementById('clientCpfPF').value = proposal.client_document || '';
                    document.getElementById('clientPhonePF').value = proposal.client_phone || '';
                    document.getElementById('clientEmailPF').value = proposal.client_email || '';
                    document.getElementById('vehicleType').value = proposal.vehicle_type || '';
                    document.getElementById('specialist').value = proposal.specialist || '';
                    
                    // Marcar como em edição
                    const proposalForm = document.getElementById('proposalForm');
                    if (proposalForm) {
                        proposalForm.dataset.editingId = proposalId;
                        proposalForm.querySelector('button[type="submit"]').textContent = 'Atualizar Proposta';
                    }
                    
                    // Navegar para a aba de novas propostas
                    document.querySelector('.menu-item[data-section="new-proposal"]')?.click();
                    showNotification("Proposta carregada para edição", "success");
                } else {
                    showNotification("Erro ao carregar proposta para edição", "error");
                }
            })
            .catch(err => {
                console.error("Erro:", err);
                showNotification("Erro ao carregar proposta", "error");
            });
    };


// ==========================================
// INICIALIZAR BOTÕES DE ESPECIALISTAS
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Configurar cliques nos botões de especialistas
    document.querySelectorAll('.btn-chat-specialist').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const specialist = this.getAttribute('data-specialist');
            
            // Mapear especialista para nome e cor
            const specialistMap = {
                'fabricio': { name: 'Fabrício', color: 'linear-gradient(135deg, #6B8CFF, #4A6FE3)' },
                'neto': { name: 'Neto', color: 'linear-gradient(135deg, #36D1DC, #5B86E5)' },
                'wandreyna': { name: 'Wandreyna', color: 'linear-gradient(135deg, #9796F0, #FBC7D1)' },
                'eder': { name: 'Edér', color: 'linear-gradient(135deg, #2C3E50, #3498DB)' },
                'suzana': { name: 'Suzana', color: 'linear-gradient(135deg, #10b981, #059669)' }
            };
            
            const specialistInfo = specialistMap[specialist];
            if (specialistInfo && typeof openSpecialistChat === 'function') {
                openSpecialistChat(specialistInfo.name, specialistInfo.color);
            }
        });
    });
    
    console.log('✅ Botões de especialistas inicializados');
});

// ==========================================
// MELHORIAS NO TRATAMENTO DE ERROS DE LOGIN
// ==========================================
// Sobrescrever a função de login para melhorar o tratamento de erros
const originalLoginUser = db.loginUser;
db.loginUser = async function(email, password) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', email, password })
        });
        
        if (!response.ok) {
            console.error('Erro HTTP:', response.status);
            return { success: false, error: 'Erro de conexão com o servidor. Verifique sua internet.' };
        }
        
        const data = await response.json();
        if (!data) {
            return { success: false, error: 'Resposta inválida do servidor' };
        }
        
        return data;
    } catch (error) {
        console.error('Erro no login:', error);
        return { success: false, error: 'Erro de conexão: ' + error.message };
    }
};

// ==========================================
// APLICAR MODO ESCURO EM ELEMENTOS FALTANTES (DENTRO DO PAINEL)
// ==========================================
function applyDarkThemeToDashboardElements() {
    const painel = document.getElementById('painel');
    if (painel && painel.classList.contains('dark-theme')) {
        // Aplicar estilos escuros aos inputs dentro do painel
        painel.querySelectorAll('input, select, textarea').forEach(input => {
            input.style.backgroundColor = '#334155';
            input.style.color = '#f1f5f9';
            input.style.borderColor = '#475569';
        });
        
        // Aplicar estilos aos botões dentro do painel
        painel.querySelectorAll('.btn-outline').forEach(btn => {
            btn.style.borderColor = '#60a5fa';
            btn.style.color = '#60a5fa';
        });
    } else if (painel) {
        // Resetar estilos se estiver no modo claro
        painel.querySelectorAll('input, select, textarea').forEach(input => {
            input.style.backgroundColor = '';
            input.style.color = '';
            input.style.borderColor = '';
        });
        
        painel.querySelectorAll('.btn-outline').forEach(btn => {
            btn.style.borderColor = '';
            btn.style.color = '';
        });
    }
}

// Observar mudanças na classe dark-theme do painel
const painelElement = document.getElementById('painel');
if (painelElement) {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                applyDarkThemeToDashboardElements();
            }
        });
    });
    observer.observe(painelElement, { attributes: true });
}

// Aplicar ao carregar
document.addEventListener('DOMContentLoaded', applyDarkThemeToDashboardElements);


// ============================================================
// ✅ SEÇÃO 3: SISTEMA DE CHAT COM ESPECIALISTAS
// ============================================================

// Funções para enviar e buscar mensagens de especialistas
db.sendSpecialistMessage = async function(userId, specialist, message) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_specialist_message',
                user_id: userId,
                specialist: specialist,
                message: message
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Erro ao enviar mensagem para especialista:', error);
        return { success: false, error: error.message };
    }
};

db.getSpecialistMessages = async function(userId, specialist) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_specialist_messages',
                user_id: userId,
                specialist: specialist
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar mensagens do especialista:', error);
        return { success: false, error: error.message };
    }
};

const initializeSpecialistChat = () => {
    const API_URL = 'https://ccapi.com.br/api.php';
    
    // Mapeamento de especialistas para tabelas
    const specialistTableMap = {
        'fabricio': 'chat_fabricio',
        'neto': 'chat_neto',
        'wandreyna': 'chat_wanfreyna',
        'eder': 'chat_eder',
        'suzana': 'chat_suzana'
    };

    // Elementos do chat
    let currentSpecialist = null;

    // Função para abrir chat de especialista
    const openSpecialistChat = async (specialist) => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) {
            showNotification("Faça login para conversar com especialistas", "error");
            if (typeof openLoginModal === 'function') openLoginModal();
            return;
        }

        currentSpecialist = specialist;

        // Criar ou atualizar a interface do chat
        createChatInterface(specialist);

        // Carregar mensagens existentes
        await loadSpecialistMessages(user.id, specialist);
    };

    // Função para criar a interface do chat
    const createChatInterface = (specialist) => {
        // Remover chat anterior se existir
        const existingChat = document.getElementById('specialistChatModal');
        if (existingChat) existingChat.remove();

        // Dados do especialista
        const specialistData = {
            'fabricio': { name: 'Fabrício', color: '#3b82f6', icon: 'F' },
            'neto': { name: 'Neto', color: '#06b6d4', icon: 'N' },
            'wandreyna': { name: 'Wandreyna', color: '#a855f7', icon: 'W' },
            'eder': { name: 'Edér', color: '#ec4899', icon: 'E' },
            'suzana': { name: 'Suzana', color: '#10b981', icon: 'S' }
        };

        const spec = specialistData[specialist];

        // Criar modal de chat
        const chatModal = document.createElement('div');
        chatModal.id = 'specialistChatModal';
        chatModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            z-index: 9999;
            animation: slideUp 0.3s ease;
        `;

        chatModal.innerHTML = `
            <div style="
                width: 100%;
                max-width: 500px;
                height: 80vh;
                background: white;
                border-radius: 20px 20px 0 0;
                display: flex;
                flex-direction: column;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
            ">
                <!-- Header -->
                <div style="
                    background: linear-gradient(135deg, ${spec.color} 0%, ${spec.color}dd 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 20px 20px 0 0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: rgba(255,255,255,0.3);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            font-size: 18px;
                        ">${spec.icon}</div>
                        <div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${spec.name}</h3>
                            <p style="margin: 2px 0 0; font-size: 12px; opacity: 0.9;">Especialista</p>
                        </div>
                    </div>
                    <button id="closeChatBtn" style="
                        background: rgba(255,255,255,0.2);
                        border: none;
                        color: white;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Messages Area -->
                <div id="specialistMessages" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f9fafb;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                "></div>

                <!-- Input Area -->
                <div style="
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                    background: white;
                    border-radius: 0 0 20px 20px;
                    display: flex;
                    gap: 8px;
                ">
                    <input 
                        id="specialistMessageInput" 
                        type="text" 
                        placeholder="Digite sua mensagem..." 
                        style="
                            flex: 1;
                            padding: 10px 14px;
                            border: 1px solid #e5e7eb;
                            border-radius: 20px;
                            font-size: 14px;
                            outline: none;
                            transition: border-color 0.2s;
                        "
                    />
                    <button id="sendSpecialistMessageBtn" style="
                        background: ${spec.color};
                        color: white;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        transition: opacity 0.2s;
                    ">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(chatModal);

        // Event listeners
        document.getElementById('closeChatBtn').addEventListener('click', () => {
            chatModal.remove();
        });

        const messageInput = document.getElementById('specialistMessageInput');
        const sendButton = document.getElementById('sendSpecialistMessageBtn');

        // Enviar mensagem ao clicar no botão
        sendButton.addEventListener('click', () => {
            sendSpecialistMessage();
        });

        // Enviar mensagem ao pressionar Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendSpecialistMessage();
            }
        });

        // Fechar ao clicar fora
        chatModal.addEventListener('click', (e) => {
            if (e.target === chatModal) {
                chatModal.remove();
            }
        });

        // Adicionar animação de slide
        if (!document.getElementById('slideUpStyle')) {
            const style = document.createElement('style');
            style.id = 'slideUpStyle';
            style.textContent = `
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    };

    // Função para enviar mensagem
    const sendSpecialistMessage = async () => {
        const user = JSON.parse(localStorage.getItem("user"));
        const messageInput = document.getElementById('specialistMessageInput');
        const message = messageInput.value.trim();

        if (!message) {
            if (typeof showNotification === 'function') {
                showNotification("Digite uma mensagem", "warning");
            }
            return;
        }

        // Desabilitar botão enquanto envia
        const sendButton = document.getElementById('sendSpecialistMessageBtn');
        sendButton.disabled = true;

        try {
            // Enviar mensagem para a API
            const result = await db.sendSpecialistMessage(user.id, currentSpecialist, message);

            if (result.success) {
                // Limpar input
                messageInput.value = '';
                messageInput.focus();

                // Recarregar mensagens
                await loadSpecialistMessages(user.id, currentSpecialist);

                if (typeof showNotification === 'function') {
                    showNotification("Mensagem enviada!", "success");
                }
            } else {
                if (typeof showNotification === 'function') {
                    showNotification(result.error || "Erro ao enviar mensagem", "error");
                }
            }
        } catch (error) {
            console.error('Erro:', error);
            if (typeof showNotification === 'function') {
                showNotification("Erro de conexão", "error");
            }
        } finally {
            sendButton.disabled = false;
        }
    };

    // Função para carregar mensagens
    const loadSpecialistMessages = async (userId, specialist) => {
        try {
            const result = await db.getSpecialistMessages(userId, specialist);

            const messagesContainer = document.getElementById('specialistMessages');
            if (!messagesContainer) return;

            messagesContainer.innerHTML = '';

            if (result.success && result.data && result.data.messages) {
                if (result.data.messages.length === 0) {
                    messagesContainer.innerHTML = `
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            color: #9ca3af;
                            text-align: center;
                        ">
                            <div>
                                <i class="fas fa-comments" style="font-size: 40px; margin-bottom: 10px; display: block;"></i>
                                <p>Nenhuma mensagem ainda.<br>Inicie a conversa!</p>
                            </div>
                        </div>
                    `;
                } else {
                    result.data.messages.forEach(msg => {
                        const messageEl = document.createElement('div');
                        messageEl.style.cssText = `
                            display: flex;
                            justify-content: ${msg.sender_type === 'user' ? 'flex-end' : 'flex-start'};
                            margin-bottom: 8px;
                        `;

                        const bubble = document.createElement('div');
                        bubble.style.cssText = `
                            max-width: 70%;
                            padding: 10px 14px;
                            border-radius: 12px;
                            background: ${msg.sender_type === 'user' ? '#3b82f6' : '#e5e7eb'};
                            color: ${msg.sender_type === 'user' ? 'white' : '#1f2937'};
                            font-size: 14px;
                            word-wrap: break-word;
                        `;

                        const timeEl = document.createElement('div');
                        timeEl.style.cssText = `
                            font-size: 11px;
                            color: #9ca3af;
                            margin-top: 4px;
                            text-align: ${msg.sender_type === 'user' ? 'right' : 'left'};
                        `;
                        timeEl.textContent = new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        bubble.textContent = msg.message;
                        messageEl.appendChild(bubble);
                        messageEl.appendChild(timeEl);
                        messagesContainer.appendChild(messageEl);
                    });

                    // Scroll para o final
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    };

    // Adicionar event listeners aos botões de chat
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.btn-chat-specialist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const specialist = btn.getAttribute('data-specialist');
                openSpecialistChat(specialist);
            });
        });

        // Também adicionar aos cards de especialista
        document.querySelectorAll('.specialist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-chat-specialist')) return;
                const specialist = card.getAttribute('data-specialist');
                openSpecialistChat(specialist);
            });
        });
    });

    // Se o DOM já foi carregado, adicionar listeners imediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.btn-chat-specialist').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const specialist = btn.getAttribute('data-specialist');
                    openSpecialistChat(specialist);
                });
            });

            document.querySelectorAll('.specialist-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-chat-specialist')) return;
                    const specialist = card.getAttribute('data-specialist');
                    openSpecialistChat(specialist);
                });
            });
        });
    } else {
        document.querySelectorAll('.btn-chat-specialist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const specialist = btn.getAttribute('data-specialist');
                openSpecialistChat(specialist);
            });
        });

        document.querySelectorAll('.specialist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-chat-specialist')) return;
                const specialist = card.getAttribute('data-specialist');
                openSpecialistChat(specialist);
            });
        });
    }
};

// Chamar a função quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            initializeSpecialistChat();
        }, 500);
    });
} else {
    setTimeout(() => {
        initializeSpecialistChat();
    }, 500);
}

// Exportar função para uso global
window.initializeSpecialistChat = initializeSpecialistChat;


// ============================================================
// SIMULADOR DE SCORE DE CRÉDITO
// ============================================================

// Função para calcular o score de crédito
function calculateCreditScore(billPayment, creditCardUsage, cleanName, positiveCadastro) {
    let score = 0;
    let breakdown = {
        cleanName: 0,
        billPayment: 0,
        creditCard: 0,
        cadastro: 0
    };

    // Critério 1: Nome Limpo (até +300 pontos ou -200 pontos)
    if (cleanName === 'yes') {
        score += 300;
        breakdown.cleanName = 300;
    } else if (cleanName === 'no') {
        score = 0; // Zera a pontuação
        breakdown.cleanName = -200; // Indicador visual
    }

    // Critério 2: Pagamento de Contas (até +200 pontos)
    if (billPayment === 'always') {
        score += 200;
        breakdown.billPayment = 200;
    } else if (billPayment === 'sometimes') {
        score += 50;
        breakdown.billPayment = 50;
    } else if (billPayment === 'many') {
        score -= 100;
        breakdown.billPayment = -100;
    }

    // Critério 3: Uso de Cartão de Crédito (até +150 pontos)
    if (creditCardUsage === 'full-payment') {
        score += 150;
        breakdown.creditCard = 150;
    } else if (creditCardUsage === 'no-use') {
        score += 50;
        breakdown.creditCard = 50;
    } else if (creditCardUsage === 'partial-payment') {
        score -= 50;
        breakdown.creditCard = -50;
    }

    // Critério 4: Cadastro Positivo (até +100 pontos)
    if (positiveCadastro === 'active') {
        score += 100;
        breakdown.cadastro = 100;
    } else if (positiveCadastro === 'inactive') {
        score += 0;
        breakdown.cadastro = 0;
    }

    // Garantir que o score não seja negativo
    score = Math.max(0, score);

    return { score, breakdown };
}

// Função para determinar a faixa de score
function getScoreRange(score) {
    if (score < 400) {
        return {
            range: 'Baixo',
            color: '#ef4444',
            icon: 'fa-exclamation-circle',
            message: 'Seu score está baixo. Recomendamos melhorar seus dados financeiros para aumentar as chances de aprovação.',
            recommendations: [
                '✓ Mantenha suas contas sempre em dia',
                '✓ Evite atrasos em pagamentos',
                '✓ Regularize qualquer negativação',
                '✓ Considere se registrar no Cadastro Positivo'
            ]
        };
    } else if (score < 700) {
        return {
            range: 'Médio',
            color: '#f59e0b',
            icon: 'fa-info-circle',
            message: 'Seu score está em um nível médio. Há boas chances de aprovação, mas você pode melhorar ainda mais.',
            recommendations: [
                '✓ Continue pagando suas contas em dia',
                '✓ Pague o cartão de crédito integralmente',
                '✓ Mantenha seu nome limpo',
                '✓ Ative o Cadastro Positivo para aumentar pontos'
            ]
        };
    } else {
        return {
            range: 'Alto',
            color: '#10b981',
            icon: 'fa-check-circle',
            message: 'Excelente! Seu score está alto. Você tem ótimas chances de aprovação em operações de crédito.',
            recommendations: [
                '✓ Parabéns! Mantenha esse excelente histórico',
                '✓ Continue com seus pagamentos em dia',
                '✓ Seu perfil é muito atrativo para instituições financeiras',
                '✓ Aproveite as melhores taxas disponíveis no mercado'
            ]
        };
    }
}

// Event listener para o botão de calcular score
function setupCreditScoreButton() {
    const calculateScoreBtn = document.getElementById('calculateScoreBtn');
    if (calculateScoreBtn) {
        const handleCalculateScore = function(e) {
            e.preventDefault();
            e.stopPropagation();

            console.log("📊 Calculando score de crédito...");

            // Obter valores dos campos
            const billPayment = document.getElementById('billPayment').value;
            const creditCardUsage = document.getElementById('creditCardUsage').value;
            const cleanName = document.getElementById('cleanName').value;
            const positiveCadastro = document.getElementById('positiveCadastro').value;

            // Validações
            if (!billPayment || !creditCardUsage || !cleanName || !positiveCadastro) {
                if (typeof showNotification === 'function') {
                    showNotification('Por favor, preencha todos os campos', 'error');
                } else {
                    alert('Por favor, preencha todos os campos');
                }
                return;
            }

            // Calcular score
            const { score, breakdown } = calculateCreditScore(billPayment, creditCardUsage, cleanName, positiveCadastro);
            const scoreRange = getScoreRange(score);

            // Atualizar elementos do resultado
            const scoreValueEl = document.getElementById('scoreValue');
            const scoreRangeEl = document.getElementById('scoreRange');
            const breakdownCleanNameEl = document.getElementById('breakdownCleanName');
            const breakdownBillPaymentEl = document.getElementById('breakdownBillPayment');
            const breakdownCreditCardEl = document.getElementById('breakdownCreditCard');
            const breakdownCadastroEl = document.getElementById('breakdownCadastro');
            const breakdownTotalEl = document.getElementById('breakdownTotal');
            const scoreRecommendationsEl = document.getElementById('scoreRecommendations');

            if (scoreValueEl) scoreValueEl.textContent = score;
            if (breakdownCleanNameEl) breakdownCleanNameEl.textContent = (breakdown.cleanName >= 0 ? '+' : '') + breakdown.cleanName + ' pts';
            if (breakdownBillPaymentEl) breakdownBillPaymentEl.textContent = (breakdown.billPayment >= 0 ? '+' : '') + breakdown.billPayment + ' pts';
            if (breakdownCreditCardEl) breakdownCreditCardEl.textContent = (breakdown.creditCard >= 0 ? '+' : '') + breakdown.creditCard + ' pts';
            if (breakdownCadastroEl) breakdownCadastroEl.textContent = (breakdown.cadastro >= 0 ? '+' : '') + breakdown.cadastro + ' pts';
            if (breakdownTotalEl) breakdownTotalEl.textContent = score + ' pts';

            // Atualizar cor do score
            const scoreCircle = document.querySelector('.score-circle');
            if (scoreCircle) {
                scoreCircle.style.borderColor = scoreRange.color;
            }

            const scoreValueSpan = document.querySelector('.score-value');
            if (scoreValueSpan) {
                scoreValueSpan.style.color = scoreRange.color;
            }

            // Atualizar faixa de score
            if (scoreRangeEl) {
                scoreRangeEl.innerHTML = `
                    <div style="text-align: center; margin-top: 15px;">
                        <div style="display: inline-block; background: ${scoreRange.color}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                            <i class="fas ${scoreRange.icon}" style="margin-right: 8px;"></i>
                            ${scoreRange.range}
                        </div>
                    </div>
                `;
            }

            // Atualizar recomendações
            if (scoreRecommendationsEl) {
                scoreRecommendationsEl.innerHTML = `
                    <div class="recommendations-box" style="background: ${scoreRange.color}15; border-left: 4px solid ${scoreRange.color}; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <h4 style="color: ${scoreRange.color}; margin-top: 0;">
                            <i class="fas ${scoreRange.icon}"></i> ${scoreRange.message}
                        </h4>
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                            ${scoreRange.recommendations.map(rec => `<p style="margin: 0; font-size: 14px; color: #333;">${rec}</p>`).join('')}
                        </div>
                    </div>
                `;
            }

            // Mostrar resultado e esconder formulário
            const formElement = document.getElementById('creditScoreForm');
            const resultElement = document.getElementById('scoreResult');

            if (formElement) formElement.style.display = 'none';
            if (resultElement) resultElement.style.display = 'block';

            if (typeof showNotification === 'function') {
                showNotification('Score calculado com sucesso!', 'success');
            }

            console.log("✅ Score de crédito calculado:", score);
        };
        
        calculateScoreBtn.addEventListener('click', handleCalculateScore);
    }
}

// Chamar a função quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCreditScoreButton);
} else {
    setupCreditScoreButton();
}

// Também chamar setupCreditScoreButton quando o painel for aberto para garantir que o botão funcione
const originalShowPainel = window.showPainel;
if (typeof originalShowPainel === 'function') {
    window.showPainel = function(...args) {
        const result = originalShowPainel.apply(this, args);
        setTimeout(() => setupCreditScoreButton(), 100);
        return result;
    };
}

// Botão de nova simulação
const newScoreCheckBtn = document.getElementById('newScoreCheckBtn');
if (newScoreCheckBtn) {
    newScoreCheckBtn.addEventListener('click', function() {
        console.log("🔄 Resetando simulação de score...");

        // Resetar formulário
        const formElement = document.getElementById('creditScoreForm');
        if (formElement) {
            formElement.reset();
            formElement.style.display = 'block';
        }

        // Esconder resultado
        const resultElement = document.getElementById('scoreResult');
        if (resultElement) {
            resultElement.style.display = 'none';
        }

        console.log("✅ Simulação resetada");
    });
}
