document.addEventListener('contextmenu', event => event.preventDefault());



// Bloqueia atalhos de teclado comuns para desenvolvedores
document.addEventListener('keydown', function(event) {
    if (event.key === 'F12') event.preventDefault();
    if (event.ctrlKey && event.shiftKey && event.key === 'I') event.preventDefault();
    if (event.ctrlKey && event.shiftKey && event.key === 'J') event.preventDefault();
    if (event.ctrlKey && event.key === 'u') event.preventDefault();
});

async function tauriOpenFile(filters) {
    if (!window.__TAURI__) return null;
    try {
        const { open } = window.__TAURI__.dialog;
        const selected = await open({
            multiple: false,
            filters: filters
        });
        if (selected) {
            const { readBinaryFile } = window.__TAURI__.fs;
            const contents = await readBinaryFile(selected);
            const fileName = selected.split(/[\/]/).pop();
            const extension = fileName.split('.').pop().toLowerCase();
            
            let mimeType = 'application/octet-stream';
            if (extension === 'pdf') mimeType = 'application/pdf';
            else if (extension === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            else if (extension === 'xls') mimeType = 'application/vnd.ms-excel';
            else if (extension === 'xml') mimeType = 'application/xml';

            return new File([contents], fileName, { type: mimeType });
        }
    } catch (err) {
        console.error("Erro ao abrir arquivo via Tauri:", err);
    }
    return null;
}

class AdminDashboard {
  constructor() {
    this.currentSection = "overview";
    this.proposals = [];
    this.allProposals = [];
    this.specialistProposals = {};
    this.currentSpecialist = null;
    this.user = null;
    this.apiEndpoint = "https://administradores.ccapi.com.br/admin-api.php";
    this.currentAdminConversationId = null;
    this.adminChatPollingInterval = null;
    this.currentProposalId = null;
    this.pendingStatusChange = null;
    this.currentCardFilter = 'all';
    this.specialistCardFilters = {};
    this.currentChart = null;
    this.currentChartYear = '';
    this.currentBankFilter = 'all';
    this.pendingBankSelection = null;
    this.banks = [
      { name: 'Santander', color: '#EC0000' },
      { name: 'BV', color: '#003366' },
      { name: 'OMNI', color: '#FF8C00' },
      { name: 'C6', color: '#2C2C2C' },
      { name: 'ITAÚ', color: '#EC7000' },
      { name: 'PAN', color: '#66B3FF' }
    ];
    this.allBills = [];
    this.filteredMonth = '';
    this.filteredYear = '';
    this.filteredBillStatus = 'all';
    this.viewMode = 'list';
    this.allClientDocuments = [];
    this.filteredClientDocuments = [];
    this.allClientes = [];
    this.filteredClientes = [];
    this.allContatos = [];
    this.allContratos = [];
    this.filteredContratos = [];
    this.filteredContatos = [];
    this.activeTabBySection = {};
    this.lastSpecialistSection = null;
    this.handleFormalizadaCardClick = this.handleFormalizadaCardClick.bind(this); // Bind the method to the instance
    this.init();
  }

  
  /**
   * Função utilitária para download de arquivos via Tauri
   */
  async tauriDownloadFile(url, defaultFileName, filters) {
    if (!window.__TAURI__) {
      window.open(url, '_blank');
      return;
    }

    try {
      this.showNotification('Preparando download...', 'info');
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const { save } = window.__TAURI__.dialog;
      const { writeFile } = window.__TAURI__.fs;

      const outputPath = await save({
        filters: filters,
        defaultPath: defaultFileName
      });

      if (outputPath) {
        await writeFile(outputPath, new Uint8Array(buffer));
        this.showNotification('Arquivo salvo com sucesso!', 'success');
      }
    } catch (err) {
      console.error("Erro ao baixar arquivo via Tauri:", err);
      this.showNotification("Erro ao baixar o arquivo", "error");
    }
  }

  /**
   * Verifica atualizacoes disponiveis via Tauri Updater
   * Compativel com Tauri v1 (window.__TAURI__.updater) e v2 (plugin-updater)
   * O arquivo update.json deve estar configurado no tauri.conf.json (updater.endpoints)
   */
  async checkUpdates() {
    try {
      // Executa apenas dentro do ambiente Tauri
      if (!window.__TAURI__) return;

      // Tauri v2: plugin-updater exposto via window.__TAURI__.updater
      // Tauri v1: window.__TAURI__.updater tambem disponivel
      const updaterApi = window.__TAURI__?.updater;
      if (!updaterApi || typeof updaterApi.check !== 'function') {
        console.warn('[Updater] Plugin de atualizacao nao disponivel. Verifique se o plugin esta registrado no tauri.conf.json.');
        return;
      }

      const update = await updaterApi.check();

      // --- Tauri v2: update.available ---
      if (update && update.available) {
        const userConfirmed = confirm(
          'Nova versao ' + update.version + ' disponivel!\n\n' +
          'Versao atual: ' + (update.currentVersion || 'desconhecida') + '\n' +
          'Notas: ' + (update.body || 'Sem notas de versao.') + '\n\n' +
          'Deseja baixar e instalar agora?'
        );
        if (userConfirmed) {
          this.showNotification('Baixando atualizacao...', 'info');
          await update.downloadAndInstall();
          
          // Reinicia o app apos instalacao (Tauri v2)
          // O usuario solicitou o uso de restart() do plugin process
          const processApi = window.__TAURI__?.process;
          if (processApi && typeof processApi.restart === 'function') {
            await processApi.restart();
          } else if (processApi && typeof processApi.relaunch === 'function') {
            await processApi.relaunch();
          } else if (window.__TAURI__?.app?.relaunch) {
            await window.__TAURI__.app.relaunch();
          }
        }
        return;
      }

      // --- Fallback Tauri v1: update.shouldUpdate ---
      if (update && update.shouldUpdate) {
        const version = update.manifest?.version || update.version || 'nova';
        const body = update.manifest?.body || 'Sem notas de versao.';
        const userConfirmed = confirm(
          'Nova versao ' + version + ' disponivel!\n\n' +
          'Notas: ' + body + '\n\n' +
          'Deseja baixar e instalar agora?'
        );
        if (userConfirmed) {
          this.showNotification('Baixando atualizacao...', 'info');
          await update.downloadAndInstall();
          
          const processApi = window.__TAURI__?.process;
          if (processApi && typeof processApi.restart === 'function') {
            await processApi.restart();
          } else if (processApi && typeof processApi.relaunch === 'function') {
            await processApi.relaunch();
          }
        }
      }
      // Nenhuma atualizacao disponivel: nao exibe notificacao para nao incomodar o usuario
    } catch (error) {
      // Erro silencioso para nao atrapalhar o uso normal do app
      console.error('[Updater] Erro ao verificar atualizacao:', error);
    }
  }

  init() {
    this.checkLoginStatus();
    this.checkUpdates();
    this.setupAuthForms();
    this.setupNavigation();
    this.setupModals();
    this.setupLogout();
    this.setupAdminChat();
    this.setupNewChatModal();
    this.setupThemeToggle();
    this.setupSearchFilters();
    this.setupChartControls();
    this.setupBankModal();
    this.setupBankFilterModal();
    this.setupPeriodFilters();
    this.setupSpreadsheetsModule();
    this.setupDocumentsModule();
    this.setupClientesContatosModule();
    this.setupContratosModule();
    this.setupNotasFiscaisModule();
    this.setupSpecialistDocumentsTabs();
    this.setupSpecialistClientesTabs();
    this.setupTabManagement();
    this.applyMasks();
    setInterval(() => this.loadDashboardData(), 180000);
  }
  setupTabManagement() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetTab = button.getAttribute('data-tab');
        const currentSection = this.currentSection;
        
        // Salvar a tab ativa para esta seção
        this.activeTabBySection[currentSection] = targetTab;
        
        // Atualizar visualmente
        const sectionElement = document.getElementById(currentSection);
        if (sectionElement) {
          sectionElement.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          button.classList.add('active');
          
          sectionElement.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          
          const targetContent = sectionElement.querySelector(`[data-tab-content="${targetTab}"]`);
          if (targetContent) {
            targetContent.classList.add('active');
          }
        }
        
        // Carregar dados específicos da tab
        if (targetTab === 'documentos') {
          this.loadClientDocuments();
        } else if (targetTab === 'notas-fiscais') {
          this.loadNotasFiscaisStats(); // ⭐ CORREÇÃO: Carregar estatísticas dos cards
          this.loadNotasFiscais();
        } else if (targetTab === 'financeiro') {
          this.loadFinanceiroStats();
          this.loadBills();
        } else if (targetTab === 'overview') {
          // ⭐ CORREÇÃO: Quando clicar na tab overview, garantir que carrega dados corretos
          const userType = this.normalizeUserType(this.user.user_type);
          
          console.log('⭐ Tab Overview clicked - User:', userType, 'Section:', currentSection);
          
          // Se for especialista (não admin), SEMPRE carregar dados do especialista
          if (userType !== 'administrador') {
            console.log('⭐ Loading SPECIALIST data for:', userType);
            this.loadSpecialistOverview(userType);
          } else {
            // Se for administrador, carregar dados gerais
            console.log('⭐ Loading ADMIN data');
            this.loadDashboardData();
          }
        }
      });
    });
  }

  // FUNÇÃO CORRIGIDA: Configurar modal de seleção de banco
  setupBankModal() {
    // Usar o ID correto do modal
    const bankModal = document.getElementById('bankSelectionModal');
    
    if (!bankModal) {
      console.error('Modal bankSelectionModal não encontrado');
      return;
    }

    // Configurar seleção de banco usando event delegation
    this.banks.forEach(bank => {
      const bankOption = document.querySelector(`[data-bank="${bank.name}"]`);
      if (bankOption) {
        // Remover onclick inline se existir
        bankOption.removeAttribute('onclick');
        bankOption.addEventListener('click', () => this.selectBank(bank.name));
      }
    });

    // Configurar botão de fechar do modal
    const closeBtn = bankModal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.removeAttribute('onclick');
      closeBtn.addEventListener('click', () => this.closeBankModal());
    }

    // Configurar botão cancelar
    const cancelBtn = bankModal.querySelector('.btn-secondary');
    if (cancelBtn) {
      cancelBtn.removeAttribute('onclick');
      cancelBtn.addEventListener('click', () => this.closeBankModal());
    }
  }

  // NOVA FUNÇÃO: Configurar modal de filtro de banco
  setupBankFilterModal() {
    const closeBankFilterModal = document.getElementById('closeBankFilterModal');
    const cancelBankFilter = document.getElementById('cancelBankFilter');
    const clearBankFilter = document.getElementById('clearBankFilter');

    if (closeBankFilterModal) {
      closeBankFilterModal.addEventListener('click', () => this.closeBankFilterModal());
    }

    if (cancelBankFilter) {
      cancelBankFilter.addEventListener('click', () => this.closeBankFilterModal());
    }

    if (clearBankFilter) {
      clearBankFilter.addEventListener('click', () => {
        this.currentBankFilter = 'all';
        this.closeBankFilterModal();
        this.filterProposals();
      });
    }

    // Configurar clique nas opções de banco no modal
    document.querySelectorAll('#bankFilterModal .bank-option').forEach(option => {
      option.addEventListener('click', () => {
        const bankName = option.getAttribute('data-bank-filter');
        this.selectBankForFilter(bankName);
      });
    });

    // Configurar botões de filtro de banco
    document.querySelectorAll('.bank-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const bankName = btn.getAttribute('data-bank-filter');
        this.filterByBank(bankName);
      });
    });

    // Adicionar evento de clique no card de Formalizadas
    const formalizedCard = document.querySelector('#overview .stat-card[data-filter="formalizada"]');
    if (formalizedCard) {
      // Remover evento antigo se existir
      formalizedCard.removeEventListener('click', this.handleFormalizadaCardClick);

      // Adicionar novo evento
      formalizedCard.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleFormalizadaCardClick();
      });
    }
  }

  // NOVA FUNÇÃO: Lidar com clique no card de Formalizadas
  handleFormalizadaCardClick() {
    // Primeiro, aplicar o filtro de status "formalizada"
    this.currentCardFilter = 'formalizada';

    // Atualizar visual dos cards
    document.querySelectorAll('#overview .stat-card').forEach(card => {
      card.classList.remove('card-active');
    });

    const activeCard = document.querySelector(`#overview .stat-card[data-filter="formalizada"]`);
    if (activeCard) {
      activeCard.classList.add('card-active');
    }

    // Mostrar modal de seleção de banco
    this.openBankFilterModal();
  }

  // NOVA FUNÇÃO: Abrir modal de filtro de banco
  openBankFilterModal() {
    const modal = document.getElementById('bankFilterModal');
    if (modal) {
      // Resetar seleções visuais
      document.querySelectorAll('#bankFilterModal .bank-option').forEach(option => {
        option.classList.remove('active');
      });

      modal.style.display = 'flex';
    }
  }

  // NOVA FUNÇÃO: Fechar modal de filtro de banco
  closeBankFilterModal() {
    const modal = document.getElementById('bankFilterModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // NOVA FUNÇÃO: Selecionar banco para filtro através do modal
  selectBankForFilter(bankName) {
    this.currentBankFilter = bankName;

    // Fechar modal
    this.closeBankFilterModal();

    // Mostrar container de filtros de banco
    const bankFiltersContainer = document.getElementById('bankFiltersContainer');
    if (bankFiltersContainer) {
      bankFiltersContainer.style.display = 'block';
    }

    // Atualizar botão ativo nos filtros de banco
    document.querySelectorAll('.bank-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-bank-filter="${bankName}"]`);
    if (activeBtn && activeBtn.classList.contains('bank-filter-btn')) {
      activeBtn.classList.add('active');
    }

    // Aplicar filtro
    this.filterProposals();

    // Mostrar gráfico filtrado
    const filtered = this.allProposals.filter(proposal =>
      proposal.status === 'formalizada' &&
      (bankName === 'all' || proposal.bank_name === bankName)
    );

    const chartTitle = bankName === 'all'
      ? 'Propostas Formalizadas - Todos os Bancos'
      : `Propostas Formalizadas - ${bankName}`;

    this.showChart(filtered, chartTitle);

    // Scroll suave para os filtros de banco
    setTimeout(() => {
      bankFiltersContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    // Notificar usuário
    const count = filtered.length;
    const message = bankName === 'all'
      ? `Exibindo ${count} proposta(s) formalizada(s) de todos os bancos`
      : `Exibindo ${count} proposta(s) formalizada(s) do banco ${bankName}`;

    this.showNotification(message, 'info');
  }

  // FUNÇÃO CORRIGIDA: Selecionar banco
  selectBank(bankName) {
    this.pendingBankSelection = bankName;

    // Remover classe active de todos os bancos
    document.querySelectorAll('.bank-option').forEach(option => {
      option.classList.remove('active');
    });

    // Adicionar classe active ao banco selecionado
    const selectedOption = document.querySelector(`[data-bank="${bankName}"]`);
    if (selectedOption) {
      selectedOption.classList.add('active');
    }

    // Auto-confirmar e ir para observação
    this.confirmBankAndStatus();
  }

  // FUNÇÃO CORRIGIDA: Confirmar banco e atualizar status
  confirmBankAndStatus() {
    if (!this.pendingBankSelection) {
      this.showNotification('Por favor, selecione um banco', 'error');
      return;
    }

    // Fechar modal de banco
    this.closeBankModal();

    // Abrir modal de observação
    document.getElementById("observationText").value = "";
    document.getElementById("observationModal").style.display = "flex";
  }

  // FUNÇÃO CORRIGIDA: Fechar modal de banco
  closeBankModal() {
    const bankModal = document.getElementById('bankSelectionModal');
    if (bankModal) {
      bankModal.style.display = 'none';
    }

    // Não resetar pendingBankSelection aqui para manter a seleção
    // this.pendingBankSelection = null;

    // Remover classe active de todos os bancos
    document.querySelectorAll('[data-bank]').forEach(option => {
      option.classList.remove('active');
    });
  }

  // NOVA FUNÇÃO: Filtrar por banco
  filterByBank(bankName) {
    this.currentBankFilter = bankName;

    // Atualizar botão ativo
    document.querySelectorAll('.bank-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.querySelector(`[data-bank-filter="${bankName}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Aplicar filtro
    this.filterProposals();
  }

  // FUNÇÃO ATUALIZADA: Filtrar por card na Visão Geral
  filterByCard(filterType) {
    // Se for clique no card de Formalizadas, usar função especial
    if (filterType === 'formalizada') {
      this.handleFormalizadaCardClick();
      return;
    }

    this.currentCardFilter = filterType;

    document.querySelectorAll('#overview .stat-card').forEach(card => {
      card.classList.remove('card-active');
    });

    const activeCard = document.querySelector(`#overview .stat-card[data-filter="${filterType}"]`);
    if (activeCard) {
      activeCard.classList.add('card-active');
    }

    // Ocultar filtros de banco para outros status
    const bankFiltersContainer = document.getElementById('bankFiltersContainer');
    if (bankFiltersContainer) {
      bankFiltersContainer.style.display = 'none';
      // Resetar filtro de banco
      this.currentBankFilter = 'all';
      document.querySelectorAll('.bank-filter-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const allBankBtn = document.querySelector('[data-bank-filter="all"]');
      if (allBankBtn) {
        allBankBtn.classList.add('active');
      }
    }

    if (filterType === 'all') {
      this.loadRecentProposalsData(this.allProposals);
      this.showChart(this.allProposals, 'Todas as Propostas');
    } else if (filterType === 'users') {
      this.hideChart();
      return;
    } else {
      const filtered = this.allProposals.filter(proposal => proposal.status === filterType);
      this.loadRecentProposalsData(filtered);
      const statusNames = {
        'pending': 'Propostas Pendentes',
        'analyzing': 'Propostas em Análise',
        'approved': 'Propostas Aprovadas',
        'rejected': 'Propostas Recusadas'
      };
      this.showChart(filtered, statusNames[filterType] || 'Propostas');
    }

    setTimeout(() => {
      const chart = document.getElementById('overviewChartContainer');
      if (chart && chart.style.display !== 'none') {
        chart.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  // NOVA FUNÇÃO: ATUALIZADA: Filtrar por card nas seções de especialistas
  filterByCardSpecialist(filterType, specialistKey) {
    this.specialistCardFilters[specialistKey] = filterType;

    document.querySelectorAll(`#${specialistKey} .stat-card`).forEach(card => {
      card.classList.remove('card-active');
    });

    const activeCard = document.querySelector(`#${specialistKey} .stat-card[data-filter="${filterType}"]`);
    if (activeCard) {
      activeCard.classList.add('card-active');
    }

    const allSpecialistProposals = this.specialistProposals[specialistKey] || [];

    let filtered = allSpecialistProposals;

    if (filterType !== 'all') {
      filtered = allSpecialistProposals.filter(proposal => proposal.status === filterType);
    }

    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const searchName = document.getElementById(`searchName${capitalizedKey}`)?.value.toLowerCase() || '';
    const searchMonth = document.getElementById(`searchMonth${capitalizedKey}`)?.value || '';
    const searchYear = document.getElementById(`searchYear${capitalizedKey}`)?.value || '';

    if (searchName || searchMonth || searchYear) {
      filtered = filtered.filter(proposal => {
        const nameMatch = !searchName || proposal.client_name.toLowerCase().includes(searchName);

        const proposalDate = new Date(proposal.created_at);
        const proposalMonth = String(proposalDate.getMonth() + 1).padStart(2, '0');
        const proposalYear = String(proposalDate.getFullYear());

        const monthMatch = !searchMonth || proposalMonth === searchMonth;
        const yearMatch = !searchYear || proposalYear === searchYear;

        return nameMatch && monthMatch && yearMatch;
      });
    }

    const container = document.querySelector(`[data-specialist="${specialistKey}"]`);
    if (container) {
      this.renderSpecialistProposals(container, filtered, specialistKey, true);
    }

    setTimeout(() => {
      const table = document.querySelector(`#${specialistKey} .proposals-table`);
      if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  // FUNÇÃO: Configurar filtros de pesquisa
  setupSearchFilters() {
    const searchName = document.getElementById('searchName');
    const searchMonth = document.getElementById('searchMonth');
    const searchYear = document.getElementById('searchYear');
    const searchSpecialist = document.getElementById('searchSpecialist');
    const clearFilters = document.getElementById('clearFilters');

    if (searchName) {
      searchName.addEventListener('input', () => this.filterProposals());
    }
    if (searchMonth) {
      searchMonth.addEventListener('change', () => this.filterProposals());
    }
    if (searchYear) {
      searchYear.addEventListener('change', () => this.filterProposals());
    }
    if (searchSpecialist) {
      searchSpecialist.addEventListener('change', () => {
        console.log('Filtro de especialista alterado:', searchSpecialist.value);
        this.filterProposals();
      });
    }
    if (clearFilters) {
      clearFilters.addEventListener('click', () => this.clearAllFilters());
    }

    const specialists = ['Fabricio', 'Neto', 'Wandreyna', 'Eder', 'Suzana'];
    specialists.forEach(specialist => {
      const searchNameEl = document.getElementById(`searchName${specialist}`);
      const searchMonthEl = document.getElementById(`searchMonth${specialist}`);
      const searchYearEl = document.getElementById(`searchYear${specialist}`);
      const searchBankEl = document.getElementById(`searchBank${specialist}`);
      const clearFiltersEl = document.getElementById(`clearFilters${specialist}`);

      if (searchNameEl) {
        searchNameEl.addEventListener('input', () => this.filterSpecialistProposals(specialist.toLowerCase()));
      }
      if (searchMonthEl) {
        searchMonthEl.addEventListener('change', () => this.filterSpecialistProposals(specialist.toLowerCase()));
      }
      if (searchYearEl) {
        searchYearEl.addEventListener('change', () => this.filterSpecialistProposals(specialist.toLowerCase()));
      }
      if (searchBankEl) {
        searchBankEl.addEventListener('change', () => this.filterSpecialistProposals(specialist.toLowerCase()));
      }
      if (clearFiltersEl) {
        clearFiltersEl.addEventListener('click', () => this.clearSpecialistFilters(specialist.toLowerCase()));
      }
    });

    this.populateYears();
  }

  // FUNÇÃO: Popular anos dinamicamente (ANOS FUTUROS)
  populateYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear + i);
    }

    const searchYear = document.getElementById('searchYear');
    if (searchYear) {
      years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        searchYear.appendChild(option);
      });
    }

    const specialists = ['Fabricio', 'Neto', 'Wandreyna', 'Eder', 'Suzana'];
    specialists.forEach(specialist => {
      const searchYearEl = document.getElementById(`searchYear${specialist}`);
      if (searchYearEl) {
        years.forEach(year => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          searchYearEl.appendChild(option);
        });
      }
    });
  }

  // FUNÇÃO ATUALIZADA: Filtrar propostas na visão geral (COM FILTRO DE BANCO E ESPECIALISTA)
  filterProposals() {
    // Captura os valores dos filtros
    const searchName = document.getElementById('searchName')?.value.toLowerCase() || '';
    const searchMonth = document.getElementById('searchMonth')?.value || '';
    const searchYear = document.getElementById('searchYear')?.value || '';
    const searchSpecialist = document.getElementById('searchSpecialist')?.value || '';

    // Função de normalização agressiva
    const normalize = (str) => {
      if (!str) return "";
      return str.toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    };

    const searchSpecNorm = normalize(searchSpecialist);

    // Filtra a lista original de propostas
    const filtered = this.allProposals.filter(p => {
      // 1. Filtro de Especialista
      if (searchSpecNorm && searchSpecNorm !== "todos") {
        const pSpecNorm = normalize(p.specialist);
        if (pSpecNorm !== searchSpecNorm) return false;
      }

      // 2. Filtro de Status (dos Cards)
      if (this.currentCardFilter !== 'all' && this.currentCardFilter !== 'users') {
        if (p.status !== this.currentCardFilter) return false;
      }

      // 3. Filtro de Banco
      if (this.currentBankFilter !== 'all') {
        if (p.bank_name !== this.currentBankFilter) return false;
      }

      // 4. Filtro de Nome/Cliente
      if (searchName) {
        const clientName = (p.client_name || "").toLowerCase();
        if (!clientName.includes(searchName)) return false;
      }

      // 5. Filtro de Mês/Ano
      if (searchMonth || searchYear) {
        const pDate = new Date(p.created_at);
        if (!isNaN(pDate.getTime())) {
          const pMonth = String(pDate.getMonth() + 1).padStart(2, '0');
          const pYear = String(pDate.getFullYear());
          if (searchMonth && pMonth !== searchMonth) return false;
          if (searchYear && pYear !== searchYear) return false;
        }
      }

      return true;
    });

    // Atualiza a tabela com os dados filtrados
    this.loadRecentProposalsData(filtered);
  }

  // ATUALIZADA: Filtrar propostas por especialista (considera filtro de card)
  filterSpecialistProposals(specialistKey) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const searchName = document.getElementById(`searchName${capitalizedKey}`)?.value.toLowerCase() || '';
    const searchMonth = document.getElementById(`searchMonth${capitalizedKey}`)?.value || '';
    const searchYear = document.getElementById(`searchYear${capitalizedKey}`)?.value || '';
    const searchBank = document.getElementById(`searchBank${capitalizedKey}`)?.value || '';

    let allSpecialistProposals = this.specialistProposals[specialistKey] || [];

    const cardFilter = this.specialistCardFilters[specialistKey];
    if (cardFilter && cardFilter !== 'all') {
      allSpecialistProposals = allSpecialistProposals.filter(proposal => proposal.status === cardFilter);
    }

    if (searchBank) {
      allSpecialistProposals = allSpecialistProposals.filter(proposal => proposal.bank_name === searchBank);
    }

    const filtered = allSpecialistProposals.filter(proposal => {
      const nameMatch = !searchName || proposal.client_name.toLowerCase().includes(searchName);

      const proposalDate = new Date(proposal.created_at);
      const proposalMonth = String(proposalDate.getMonth() + 1).padStart(2, '0');
      const proposalYear = String(proposalDate.getFullYear());

      const monthMatch = !searchMonth || proposalMonth === searchMonth;
      const yearMatch = !searchYear || proposalYear === searchYear;

      return nameMatch && monthMatch && yearMatch;
    });

    const container = document.querySelector(`[data-specialist="${specialistKey}"]`);
    if (container) {
      this.renderSpecialistProposals(container, filtered, specialistKey, true);
    }
  }

  // FUNÇÃO: Limpar filtros da visão geral
  clearAllFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('searchMonth').value = '';
    document.getElementById('searchYear').value = '';
    const searchSpecialist = document.getElementById('searchSpecialist');
    if (searchSpecialist) searchSpecialist.value = '';

    this.currentCardFilter = 'all';
    this.currentBankFilter = 'all'; // NOVO: Resetar filtro de banco

    document.querySelectorAll('#overview .stat-card').forEach(card => {
      card.classList.remove('card-active');
    });

    // NOVO: Resetar botões de filtro de banco
    document.querySelectorAll('.bank-filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const allBankBtn = document.querySelector('[data-bank-filter="all"]');
    if (allBankBtn) {
      allBankBtn.classList.add('active');
    }

    this.filterProposals();
  }

  // ATUALIZADA: Limpar filtros do especialista (inclui filtro de card)
  clearSpecialistFilters(specialistKey) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const searchNameEl = document.getElementById(`searchName${capitalizedKey}`);
    const searchMonthEl = document.getElementById(`searchMonth${capitalizedKey}`);
    const searchYearEl = document.getElementById(`searchYear${capitalizedKey}`);
    const searchBankEl = document.getElementById(`searchBank${capitalizedKey}`);

    if (searchNameEl) searchNameEl.value = '';
    if (searchMonthEl) searchMonthEl.value = '';
    if (searchYearEl) searchYearEl.value = '';
    if (searchBankEl) searchBankEl.value = '';

    this.specialistCardFilters[specialistKey] = 'all';
    this.specialistBankFilters = this.specialistBankFilters || {};
    this.specialistBankFilters[specialistKey] = 'all';
    document.querySelectorAll(`#${specialistKey} .stat-card`).forEach(card => {
      card.classList.remove('card-active');
    });

    this.filterSpecialistProposals(specialistKey);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      // Remover event listeners antigos para evitar duplicidade
      const newThemeToggle = themeToggle.cloneNode(true);
      themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
      
      newThemeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTheme();
      });
    }
    // Aplicar tema salvo ao carregar
    const savedTheme = localStorage.getItem('admin-theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon();
  }

  toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Otimização: desabilitar transições temporariamente durante a troca de tema
    document.body.style.transition = 'none';
    document.body.setAttribute('data-theme', newTheme);
    
    localStorage.setItem('admin-theme', newTheme);
    this.updateThemeIcon();
    
    // Forçar reflow e restaurar transições
    setTimeout(() => {
      document.body.style.transition = '';
    }, 100);
  }

  updateThemeIcon() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const currentTheme = document.body.getAttribute('data-theme');
      if (currentTheme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      }
    }
  }

  checkLoginStatus() {
    const storedUser = localStorage.getItem("adminUser");
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
        console.log("Usuário encontrado:", this.user);
        this.showAdminDashboard();
        this.loadDashboardData();
      } catch (error) {
        console.error("Erro ao parsear usuário:", error);
        localStorage.removeItem("adminUser");
        this.showLoginForm();
      }
    } else {
      this.showLoginForm();
    }
  }

  setupAuthForms() {
    document.getElementById("loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById("registerForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    document.getElementById("showRegisterForm")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });

    document.getElementById("showLoginForm")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showLoginForm();
    });
  }

  async handleLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorMessageElement = document.getElementById("loginErrorMessage");

    errorMessageElement.textContent = "";

    if (!email || !password) {
      errorMessageElement.textContent = "Por favor, preencha email e senha";
      return;
    }

    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "admin_login",
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.user) {
        this.user = data.data.user;
        localStorage.setItem("adminUser", JSON.stringify(this.user));

        this.showAdminDashboard();
        this.loadDashboardData();
        this.showNotification("Login realizado com sucesso!", "success");
      } else {
        errorMessageElement.textContent = data.error || "Credenciais inválidas";
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      errorMessageElement.textContent = "Erro de conexão. Tente novamente.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  async handleRegister() {
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const userType = document.getElementById("userType").value;

    const errorMessageElement = document.getElementById("registerErrorMessage");
    const successMessageElement = document.getElementById("registerSuccessMessage");

    errorMessageElement.textContent = "";
    successMessageElement.textContent = "";

    const errors = [];

    if (!name || name.length < 2) errors.push("Nome deve ter pelo menos 2 caracteres");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email inválido");
    if (!password || password.length < 4) errors.push("Senha deve ter pelo menos 4 caracteres");
    if (!userType) errors.push("Selecione o tipo de acesso");

    if (errors.length > 0) {
      errorMessageElement.textContent = errors.join(", ");
      return;
    }

    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Cadastrando...';

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "admin_register",
          name: name,
          email: email,
          password: password,
          user_type: userType
        }),
      });

      const data = await response.json();

      if (data.success) {
        successMessageElement.textContent = "Cadastro realizado com sucesso! Redirecionando...";

        document.getElementById("registerName").value = "";
        document.getElementById("registerEmail").value = "";
        document.getElementById("registerPassword").value = "";
        document.getElementById("userType").value = "";

        setTimeout(() => {
          this.showLoginForm();
          successMessageElement.textContent = "";
        }, 2000);
      } else {
        errorMessageElement.textContent = data.error || "Erro ao cadastrar";
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      errorMessageElement.textContent = "Erro de conexão. Tente novamente.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  setupLogout() {
    document.getElementById("logoutButton")?.addEventListener("click", () => {
      if (this.adminChatPollingInterval) {
        clearInterval(this.adminChatPollingInterval);
        this.adminChatPollingInterval = null;
      }

      localStorage.removeItem("adminUser");
      // Opcional: localStorage.removeItem(`welcome_shown_${this.user.email}`); // Se quiser que apareça toda vez que logar pela primeira vez na sessão
      this.user = null;
      this.showLoginForm();
      this.showNotification("Logout realizado com sucesso!", "info");
    });
  }

  showLoginForm() {
    document.getElementById("loginContainer").style.display = "flex";
    document.getElementById("registerContainer").style.display = "none";
    document.getElementById("adminContainer").style.display = "none";
  }

  showRegisterForm() {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("registerContainer").style.display = "flex";
    document.getElementById("adminContainer").style.display = "none";
  }

  showAdminDashboard() {
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("registerContainer").style.display = "none";
    document.getElementById("adminContainer").style.display = "flex";

    this.setupUserInterface();

    const userNameElement = document.getElementById("adminUserName");
    if (userNameElement) {
      userNameElement.textContent = this.user.name || "Admin";
    }

    // Carrega foto de perfil persistida (chaveada por email, sobrevive ao logout)
    this.loadProfilePhoto();

    const initialSection = this.getInitialSection();
    this.showSection(initialSection);
    this.checkFirstAccess();
    
    // Garantir que o tutorial carregue se for a seção inicial
    if (initialSection === 'tutorial') {
        this.loadTutorialContent();
    }

    // Verificação de acesso periódica (a cada 7 dias)
    setTimeout(() => this.checkPeriodicVerification(), 800);
  }

  setupUserInterface() {
    if (!this.user || !this.user.user_type) return;

    const userType = this.normalizeUserType(this.user.user_type);
    const userTypeBadge = document.getElementById("adminUserType");

    if (userType === 'administrador') {
      userTypeBadge.textContent = "Administrador";
      userTypeBadge.className = "user-type-badge admin-badge";

      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'block';
      });
      document.querySelectorAll('.specialist-only').forEach(el => {
        el.style.display = 'none';
      });

    } else {
      const specialistNameMap = {
          'fabricio': 'Fabrício',
          'neto': 'Neto',
          'wandreyna': 'Wandreyna',
          'eder': 'Éder',
          'suzana': 'Suzana'
      };

      const nameToShow = specialistNameMap[userType] || this.capitalizeFirst(userType);
      userTypeBadge.textContent = `Especialista - ${nameToShow}`;
      userTypeBadge.className = "user-type-badge specialist-badge";

      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll('.specialist-only').forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll(`.specialist-${userType}`).forEach(el => {
        el.style.display = '';
      });
    }
    // Garantir que a aba de tutorial esteja visível para todos
    document.querySelectorAll('[data-section="tutorial"]').forEach(el => el.style.display = '');
  }

  getInitialSection() {
    if (!this.user || !this.user.user_type) return "overview";

    const normalizedType = this.normalizeUserType(this.user.user_type);

    if (normalizedType === 'administrador') {
      return "overview";
    } else {
      return normalizedType;
    }
  }

  normalizeUserType(userType) {
    if (!userType) return '';

    const normalized = userType.toLowerCase().replace(/\s/g, '');

    if (normalized === 'administrador' || normalized === 'admin') {
      return 'administrador';
    }
    if (normalized === 'fabricio') {
      return 'fabricio';
    }
    if (normalized === 'neto') {
      return 'neto';
    }
    if (normalized === 'paulo' || normalized === 'wandreyna') {
      return 'wandreyna';
    }
    if (normalized === 'alexandre' || normalized === 'eder') {
      return 'eder';
    }
    if (normalized === 'suzana') {
      return 'suzana';
    }

    // Especialistas dinâmicos
    if (this._dynamicSpecialists) {
      for (const s of this._dynamicSpecialists) {
        const kn = s.key_name.toLowerCase().replace(/\s/g,'');
        const nn = s.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s/g,'');
        if (normalized === kn || normalized === nn) return s.key_name;
      }
    }

    return normalized;
  }

  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const section = item.dataset.section;

        // CORREÇÃO: Permitir que todos acessem a seção "overview" (Visão Geral)
        if (section === 'overview') {
            this.showSection(section);
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            return;
        }

        // Tutorial section access
        if (section === 'tutorial') {
            this.showSection(section);
            navItems.forEach((nav) => nav.classList.remove("active"));
            item.classList.add("active");
            return;
        }

        // Verificar permissões para outras seções
        if (item.classList.contains('specialist-only') && item.style.display === 'none') {
            if (this.user.user_type.toLowerCase().includes(section)) {
                this.showSection(section);
            } else {
                return;
            }
        } else if (item.classList.contains('admin-only') && this.user.user_type !== 'administrador') {
             const isSpecialistMyProposals = item.classList.contains('specialist-only') && item.style.display === '';
             if (!isSpecialistMyProposals) {
                return;
             }
        }

        this.showSection(section);

        navItems.forEach((nav) => nav.classList.remove("active"));
        item.classList.add("active");
      });
    });

    // NOVO: Configurar event listeners para botões de tabs (para aba financeiro)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.getAttribute('data-tab') === 'financeiro') {
          this.loadFinanceiroStats();
          this.loadBills();
        }
      });
    });
  }

  showSection(sectionId) {
    console.log('⭐ showSection called:', sectionId, 'User:', this.user?.user_type);
    
    // Ocultar todas as seções
    document.querySelectorAll(".admin-section").forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.add("active");
      this.currentSection = sectionId;
      
      // ⭐ CORREÇÃO: Salvar última seção de especialista
      const userType = this.normalizeUserType(this.user.user_type);
      if (userType !== 'administrador' && sectionId === userType) {
        this.lastSpecialistSection = sectionId;
      }

      // Atualizar navegação ativa
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.remove("active");
        if (item.dataset.section === sectionId) {
            const isSpecialistSection = item.classList.contains(`specialist-${sectionId}`) || item.dataset.section === sectionId;

            // Permitir que todos vejam o botão "overview" como ativo
            if (sectionId === 'overview' || this.user.user_type.toLowerCase().includes('admin') || isSpecialistSection) {
                item.classList.add("active");
            }
        }
      });

      // ⭐ CORREÇÃO: Restaurar tab ativa para esta seção
      const savedTab = this.activeTabBySection[sectionId];
      console.log('⭐ Saved tab for section', sectionId, ':', savedTab);
      
      if (savedTab && targetSection.querySelector('.tabs-navigation')) {
        // Restaurar tab salva
        targetSection.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('active');
          if (btn.getAttribute('data-tab') === savedTab) {
            btn.classList.add('active');
          }
        });
        
        targetSection.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
          if (content.getAttribute('data-tab-content') === savedTab) {
            content.classList.add('active');
          }
        });
        
        // Carregar dados da tab restaurada
        if (savedTab === 'documentos') {
          this.loadClientDocuments();
        } else if (savedTab === 'notas-fiscais') {
          this.loadNotasFiscais();
        } else if (savedTab === 'financeiro') {
          this.loadFinanceiroStats();
          this.loadBills();
        } else if (savedTab === 'overview') {
          // ⭐ CORREÇÃO CRÍTICA: Ao restaurar tab overview
          if (userType !== 'administrador' && sectionId === userType) {
            // Se for especialista em sua própria seção, carregar SEUS dados
            console.log('⭐ Loading specialist overview for:', userType);
            this.loadSpecialistOverview(userType);
          } else if (sectionId === 'overview') {
            // Se for admin na seção overview
            this.loadDashboardData();
          }
        }
      } else {
        // ⭐ CORREÇÃO: Se não há tab salva, usar lógica padrão
        console.log('⭐ No saved tab, using default logic for:', sectionId);
        
        if (sectionId === 'overview') {
          // Admin acessando overview
          this.loadDashboardData();
        } else if (userType !== 'administrador' && sectionId === userType) {
          // Especialista acessando sua própria seção
          // Garantir que a tab 'overview' está ativa por padrão
          const overviewTab = targetSection.querySelector('.tab-btn[data-tab="overview"]');
          if (overviewTab) {
            overviewTab.classList.add('active');
            console.log('⭐ Activated overview tab for specialist');
          }
          
          const overviewContent = targetSection.querySelector('[data-tab-content="overview"]');
          if (overviewContent) {
            overviewContent.classList.add('active');
            console.log('⭐ Activated overview content for specialist');
          }
          
          // Carregar dados do especialista
          console.log('⭐ Loading specialist data for:', userType);
          this.loadSpecialistOverview(userType);
          this.activeTabBySection[sectionId] = 'overview';
        }
      }

      // Carregar dados específicos da seção
      if (sectionId === "tutorial") {
        this.loadTutorialContent();
      } else if (sectionId === "chats") {
        this.loadAdminChats();
        this.startAdminChatPolling();
      } else if (sectionId !== "overview") {
        if (userType === 'administrador' || sectionId === userType) {
          this.loadSpecialistProposals(sectionId);
        }
      }
    }
  }

  async loadDashboardData() {
    // ⭐ CORREÇÃO: Verificar se é especialista antes de carregar dados gerais
    const userType = this.normalizeUserType(this.user.user_type);
    
    // Se for especialista e currentSection for sua seção, carregar dados do especialista
    if (userType !== 'administrador' && this.currentSection === userType) {
      console.log('⭐ loadDashboardData: Loading specialist data for', userType);
      await this.loadSpecialistOverview(userType);
      return;
    }

    // Se for administrador ou estiver na seção overview, carregar dados gerais
    console.log('⭐ loadDashboardData: Loading general admin data');
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_overview_stats",
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.loadOverviewStats(data.data);
        await this.loadRecentProposals();

        if (this.currentSection === 'chats') {
          this.loadAdminChats();
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      this.loadOverviewStats({
        total_proposals: 0,
        total_users: 0,
        pending_proposals: 0,
        analyzing_proposals: 0,
        approved_proposals: 0,
        rejected_proposals: 0,
        formalizada_proposals: 0,
      });
    }
  }

  loadOverviewStats(stats) {
    document.getElementById("totalSystemProposals").textContent = stats.total_proposals || 0;
    document.getElementById("totalSystemUsers").textContent = stats.total_users || 0;
    document.getElementById("pendingSystemProposals").textContent = stats.pending_proposals || 0;
    document.getElementById("analyzingSystemProposals").textContent = stats.analyzing_proposals || 0;
    document.getElementById("approvedSystemProposals").textContent = stats.approved_proposals || 0;
    document.getElementById("rejectedSystemProposals").textContent = stats.rejected_proposals || 0;
    document.getElementById("formalizadaSystemProposals").textContent = stats.formalizada_proposals || 0;
  }

  async loadRecentProposals() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_all_proposals",
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.allProposals = data.data.proposals || [];

        if (this.currentCardFilter !== 'all' && this.currentCardFilter !== 'users') {
          const filtered = this.allProposals.filter(proposal => proposal.status === this.currentCardFilter);
          this.loadRecentProposalsData(filtered);
        } else {
          this.loadRecentProposalsData(this.allProposals);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar propostas:", error);
      this.loadRecentProposalsData([]);
    }
  }

  // NOVA FUNÇÃO: Carregar visão geral filtrada para especialistas
  async loadSpecialistOverview(specialistKey) {
    console.log('⭐ loadSpecialistOverview called for:', specialistKey);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_specialist_proposals",
          specialist: specialistKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const specialistProposals = data.data.proposals || [];
        
        // Calcular estatísticas do especialista
        const stats = {
          total_proposals: specialistProposals.length,
          total_users: 0, // Não relevante para especialista
          pending_proposals: specialistProposals.filter(p => p.status === 'pending').length,
          analyzing_proposals: specialistProposals.filter(p => p.status === 'analyzing').length,
          approved_proposals: specialistProposals.filter(p => p.status === 'approved').length,
          rejected_proposals: specialistProposals.filter(p => p.status === 'rejected').length,
          formalizada_proposals: specialistProposals.filter(p => p.status === 'formalizada').length,
        };

        // ⭐ CORREÇÃO: Atualizar stats no contexto correto (dentro da seção do especialista)
        const sectionElement = document.getElementById(specialistKey);
        
        if (sectionElement) {
          // Tentar encontrar elementos dentro da seção do especialista
          const totalEl = sectionElement.querySelector('#totalSystemProposals, [id$="TotalProposals"]');
          const usersEl = sectionElement.querySelector('#totalSystemUsers, [id$="TotalUsers"]');
          const pendingEl = sectionElement.querySelector('#pendingSystemProposals, [id$="PendingProposals"]');
          const analyzingEl = sectionElement.querySelector('#analyzingSystemProposals, [id$="AnalyzingProposals"]');
          const approvedEl = sectionElement.querySelector('#approvedSystemProposals, [id$="ApprovedProposals"]');
          const rejectedEl = sectionElement.querySelector('#rejectedSystemProposals, [id$="RejectedProposals"]');
          const formalizadaEl = sectionElement.querySelector('#formalizadaSystemProposals, [id$="FormalizadaProposals"]');
          
          if (totalEl) totalEl.textContent = stats.total_proposals || 0;
          if (usersEl) usersEl.textContent = stats.total_users || 0;
          if (pendingEl) pendingEl.textContent = stats.pending_proposals || 0;
          if (analyzingEl) analyzingEl.textContent = stats.analyzing_proposals || 0;
          if (approvedEl) approvedEl.textContent = stats.approved_proposals || 0;
          if (rejectedEl) rejectedEl.textContent = stats.rejected_proposals || 0;
          if (formalizadaEl) formalizadaEl.textContent = stats.formalizada_proposals || 0;
          
          console.log('⭐ Updated stats within specialist section');
        } else {
          // Fallback: atualizar elementos globais
          console.log('⭐ Section element not found, updating global stats');
          this.loadOverviewStats(stats);
        }
        
        // Armazenar propostas
        this.allProposals = specialistProposals;
        this.specialistProposals[specialistKey] = specialistProposals;
        
        // Carregar propostas na tabela
        if (this.currentCardFilter !== 'all' && this.currentCardFilter !== 'users') {
          const filtered = specialistProposals.filter(proposal => proposal.status === this.currentCardFilter);
          this.loadRecentProposalsData(filtered);
        } else {
          this.loadRecentProposalsData(specialistProposals);
        }
        
        console.log('⭐ Specialist overview loaded successfully for:', specialistKey);
      }
    } catch (error) {
      console.error("Erro ao carregar visão geral do especialista:", error);
      this.loadOverviewStats({
        total_proposals: 0,
        total_users: 0,
        pending_proposals: 0,
        analyzing_proposals: 0,
        approved_proposals: 0,
        rejected_proposals: 0,
        formalizada_proposals: 0,
      });
      this.loadRecentProposalsData([]);
    }
  }



  getBankBadge(bankName) {
    if (!bankName) return '';

    const bank = this.banks.find(b => b.name === bankName);
    if (!bank) return '';

    return `<span class="bank-badge" style="background-color: ${bank.color}; color: white; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; display: inline-block; margin-left: 8px;">${bank.name}</span>`;
  }

  // FUNÇÃO ATUALIZADA: Carregar dados de propostas recentes (COM BADGE DE BANCO)
  loadRecentProposalsData(proposals) {
    const tableBody = document.getElementById("recentProposalsTable");

    if (!proposals || proposals.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" class="no-data">Nenhuma proposta encontrada</td></tr>';
      return;
    }

    tableBody.innerHTML = proposals
      .map(
        (proposal) => `
            <tr class="proposal-row" onclick="adminDashboard.showProposalDetails('${proposal.id}')" style="cursor: pointer;">
                <td>${proposal.id || 'N/A'}</td>
                <td>${proposal.client_name || 'N/A'}<br><small>${proposal.client_document || 'N/A'}</small></td>
                <td>${proposal.specialist || 'N/A'}</td>
                <td>R$ ${Number.parseFloat(proposal.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                <td>
                  <span class="status-badge status-${proposal.status}">${this.getStatusText(proposal.status)}</span>
                  ${this.getBankBadge(proposal.bank_name)}
                </td>
                <td>${new Date(proposal.created_at).toLocaleDateString("pt-BR")}</td>
                <td>${proposal.vehicle_year_manufacture || 'N/A'}</td>
                <td>${proposal.vehicle_year_model || 'N/A'}</td>
                <td onclick="event.stopPropagation();">
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'approved')" title="Aprovar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-info btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'analyzing')" title="Em Análise">
                            <i class="fas fa-search"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'pending')" title="Pendente">
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'rejected')" title="Recusar">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-purple btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'formalizada')" title="Formalizada">
                            <i class="fas fa-file-signature"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm"
                                onclick="adminDashboard.startConversationWithUser('${proposal.id}', '${proposal.client_name}')"
                                title="Iniciar Chat">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="adminDashboard.showProposalDetails('${proposal.id}')" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  async loadSpecialistProposals(specialistKey) {
    const container = document.querySelector(`[data-specialist="${specialistKey}"]`);
    if (!container) return;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_specialist_proposals",
          specialist: specialistKey,
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.specialistProposals[specialistKey] = data.data.proposals || [];
        this.renderSpecialistProposals(container, this.specialistProposals[specialistKey], specialistKey);
      }
    } catch (error) {
      console.error("Erro ao carregar propostas do especialista:", error);
      container.innerHTML = '<p class="no-data">Erro ao carregar propostas</p>';
    }
  }

  calculateSpecialistStats(proposals) {
    return {
      total: proposals.length,
      pending: proposals.filter(p => p.status === 'pending').length,
      analyzing: proposals.filter(p => p.status === 'analyzing').length,
      approved: proposals.filter(p => p.status === 'approved').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
      formalizada: proposals.filter(p => p.status === 'formalizada').length
    };
  }

  renderSpecialistProposals(container, proposals, specialistKey, isFiltered = false) {
    if (!proposals || proposals.length === 0) {
      const specialistNameMap = {
          'fabricio': 'Fabrício',
          'neto': 'Neto',
          'wandreyna': 'Wandreyna',
          'eder': 'Éder',
          'suzana': 'Suzana'
      };
      const nameToShow = specialistNameMap[specialistKey] || this.capitalizeFirst(specialistKey);

      container.innerHTML = `
                <div class="no-data" style="text-align: center; padding: 2rem; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>Nenhuma proposta encontrada para ${nameToShow}</p>
                </div>
            `;
      return;
    }

    const statsProposals = isFiltered ? proposals : (this.specialistProposals[specialistKey] || []);
    const stats = this.calculateSpecialistStats(statsProposals);

    const specialistNameMap = {
          'fabricio': 'Fabrício',
          'neto': 'Neto',
          'wandreyna': 'Wandreyna',
          'eder': 'Éder',
          'suzana': 'Suzana'
      };
    const nameToShow = specialistNameMap[specialistKey] || this.capitalizeFirst(specialistKey);

    container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 2rem;">
                <div class="stat-card" data-filter="all" onclick="adminDashboard.filterByCardSpecialist('all', '${specialistKey}')">
                    <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
                    <div class="stat-content">
                        <h3>${stats.total}</h3>
                        <p>Total de Propostas</p>
                    </div>
                </div>
                <div class="stat-card" data-filter="pending" onclick="adminDashboard.filterByCardSpecialist('pending', '${specialistKey}')">
                    <div class="stat-icon" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.2) 100%); color: #f59e0b;"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <h3>${stats.pending}</h3>
                        <p>Pendentes</p>
                    </div>
                </div>
                <div class="stat-card" data-filter="analyzing" onclick="adminDashboard.filterByCardSpecialist('analyzing', '${specialistKey}')">
                    <div class="stat-icon" style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(14, 165, 233, 0.2) 100%); color: #0ea5e9;"><i class="fas fa-search"></i></div>
                    <div class="stat-content">
                        <h3>${stats.analyzing}</h3>
                        <p>Em Análise</p>
                    </div>
                </div>
                <div class="stat-card" data-filter="approved" onclick="adminDashboard.filterByCardSpecialist('approved', '${specialistKey}')">
                    <div class="stat-icon" style="background: linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%); color: #16a34a;"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-content">
                        <h3>${stats.approved}</h3>
                        <p>Aprovadas</p>
                    </div>
                </div>
                <div class="stat-card" data-filter="rejected" onclick="adminDashboard.filterByCardSpecialist('rejected', '${specialistKey}')">
                    <div class="stat-icon" style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.2) 100%); color: #dc2626;"><i class="fas fa-times-circle"></i></div>
                    <div class="stat-content">
                        <h3>${stats.rejected}</h3>
                        <p>Recusadas</p>
                    </div>
                </div>
                <div class="stat-card" data-filter="formalizada" onclick="adminDashboard.filterByCardSpecialist('formalizada', '${specialistKey}')">
                    <div class="stat-icon" style="background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0.2) 100%); color: #9333ea;"><i class="fas fa-file-signature"></i></div>
                    <div class="stat-content">
                        <h3>${stats.formalizada}</h3>
                        <p>Formalizadas</p>
                    </div>
                </div>
            </div>
            <div class="proposals-table">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Cliente</th>
                            <th>Valor</th>
                            <th>Status / Banco</th>
                            <th>Data</th>
                            <th>Ano Fabricação</th>
                            <th>Ano Modelo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proposals
                          .map(
                            (proposal) => `
                        <tr class="proposal-row" onclick="adminDashboard.showProposalDetails('${proposal.id}')" style="cursor: pointer;">
                            <td>${proposal.id || 'N/A'}</td>
                            <td>${proposal.client_name || 'N/A'}<br><small>${proposal.client_document || 'N/A'}</small></td>
                            <td>R$ ${Number.parseFloat(proposal.finance_value || proposal.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                            <td>
                              <span class="status-badge status-${proposal.status}">${this.getStatusText(proposal.status)}</span>
                              ${this.getBankBadge(proposal.bank_name)}
                            </td>
                            <td>${new Date(proposal.created_at).toLocaleDateString("pt-BR")}</td>
                            <td>${proposal.vehicle_year_manufacture || 'N/A'}</td>
                            <td>${proposal.vehicle_year_model || 'N/A'}</td>
                            <td onclick="event.stopPropagation();">
                                <div class="action-buttons">
                                    <button class="btn btn-success btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'approved', '${specialistKey}')" title="Aprovar">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'analyzing', '${specialistKey}')" title="Em Análise">
                                        <i class="fas fa-search"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'pending', '${specialistKey}')" title="Pendente">
                                        <i class="fas fa-clock"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'rejected', '${specialistKey}')" title="Recusar">
                                        <i class="fas fa-times"></i>
                                    </button>
                                    <button class="btn btn-purple btn-sm" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'formalizada', '${specialistKey}')" title="Formalizada">
                                        <i class="fas fa-file-signature"></i>
                                    </button>
                                    <button class="btn btn-secondary btn-sm"
                                            onclick="adminDashboard.startConversationWithUser('${proposal.id}', '${proposal.client_name}')"
                                            title="Iniciar Chat">
                                        <i class="fas fa-comments"></i>
                                    </button>
                                    <button class="btn btn-primary btn-sm" onclick="adminDashboard.showProposalDetails('${proposal.id}')" title="Ver Detalhes">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    const activeFilter = this.specialistCardFilters[specialistKey];
    if (activeFilter) {
      const activeCard = document.querySelector(`#${specialistKey} .stat-card[data-filter="${activeFilter}"]`);
      if (activeCard) {
        activeCard.classList.add('card-active');
      }
    }
  }

  getStatusText(status) {
    const statusMap = {
      'pending': 'Pendente',
      'analyzing': 'Em Análise',
      'approved': 'Aprovada',
      'rejected': 'Recusada',
      'formalizada': 'Formalizada'
    };
    return statusMap[status] || status;
  }

  // Função para formatar datas sem problemas de fuso horário
  formatDateWithoutTimezone(dateString) {
    if (!dateString) return 'N/A';
    try {
      // Se for uma string no formato YYYY-MM-DD, dividir e criar data local
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      // Se for um objeto Date ou timestamp
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      return 'N/A';
    }
  }

  // Funções de Máscara Instantânea
  applyMasks() {
    const masks = {
      cpf: (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2').substring(0, 14),
      cnpj: (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18),
      phone: (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15),
      cep: (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9),
      rg: (v) => {
        // Remove tudo que não é letra ou número
        let cleaned = v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        // Limita a 15 caracteres (suficiente para RG antigo ou novo)
        return cleaned.substring(0, 15);
      },
      money: (v) => {
        v = v.replace(/\D/g, '');
        v = (Number(v) / 100).toFixed(2).replace('.', ',');
        v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
        return 'R$ ' + v;
      }
    };

    const setupInputMask = (selector, maskType) => {
      const inputs = document.querySelectorAll(selector);
      inputs.forEach(input => {
        if (input.dataset.maskApplied) return;
        input.addEventListener('input', (e) => {
          const pos = e.target.selectionStart;
          const oldLen = e.target.value.length;
          e.target.value = masks[maskType](e.target.value);
          const newLen = e.target.value.length;
          if (pos !== null) {
            const newPos = pos + (newLen - oldLen);
            e.target.setSelectionRange(newPos, newPos);
          }
        });
        input.dataset.maskApplied = 'true';
      });
    };

    // Aplicar máscaras nos campos de nova proposta
    setupInputMask('#newClientCPF', 'cpf');
    setupInputMask('#newClientCNPJ', 'cnpj');
    setupInputMask('#newClientCNPJ_PF', 'cnpj');
    setupInputMask('#newClientPhone', 'phone');
    setupInputMask('#newClientCep', 'cep');
    setupInputMask('#newClientRG', 'rg');
    setupInputMask('#newClientRG_UF', 'rg'); // Aplicar máscara ao UF do RG também
    setupInputMask('#newClientIncome', 'money');
    setupInputMask('#newVehicleValue', 'money');
    setupInputMask('#newFinanceValue', 'money');
    setupInputMask('#newFinanceEntry', 'money');

    // Aplicar máscaras nos campos de edição (quando o modal abrir)
    setupInputMask('#editClientPhone', 'phone');
    setupInputMask('#editClientDocument', 'cpf'); // Pode ser CPF ou CNPJ, ideal seria dinâmico
    setupInputMask('#editClientCep', 'cep');
    setupInputMask('#editClientRG', 'rg');
    setupInputMask('#editClientIncome', 'money');
    setupInputMask('#editVehicleValue', 'money');
  }

  decodeHTMLEntities(text) {
    if (!text) return '';
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }

  async showProposalDetails(proposalId) {
    try {
      const response = await fetch(`${this.apiEndpoint}?action=get_proposal_details&proposal_id=${proposalId}`);
      const data = await response.json();

      if (!data.success) {
        this.showNotification("Erro ao carregar detalhes da proposta", "error");
        return;
      }

      const proposal = data.data.proposal;
      const specialistKey = this.normalizeUserType(proposal.specialist);

      let actionButtons = '';
      if (this.user.user_type.toLowerCase() === 'administrador' || this.normalizeUserType(this.user.user_type) === specialistKey) {
        actionButtons = `
          <button class="btn btn-success" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'approved', '${specialistKey}')">
            <i class="fas fa-check"></i> Aprovar
          </button>
          <button class="btn btn-info" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'analyzing', '${specialistKey}')">
            <i class="fas fa-search"></i> Em Análise
          </button>
          <button class="btn btn-warning" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'pending', '${specialistKey}')">
            <i class="fas fa-clock"></i> Pendente
          </button>
          <button class="btn btn-danger" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'rejected', '${specialistKey}')">
            <i class="fas fa-times"></i> Recusar
          </button>
          <button class="btn btn-purple" onclick="adminDashboard.handleProposalStatusChange('${proposal.id}', 'formalizada', '${specialistKey}')">
            <i class="fas fa-file-signature"></i> Formalizada
          </button>
          <button class="btn btn-secondary" onclick="adminDashboard.startConversationWithUser('${proposal.id}', '${proposal.client_name}')">
            <i class="fas fa-comments"></i> Chat
          </button>
          <button class="btn btn-success btn-attach-document" onclick="adminDashboard.openAttachDocumentModal('${proposal.id}', '${proposal.client_name}')">
            <i class="fas fa-paperclip"></i> Anexar Documento
          </button>
          <button class="btn btn-info" onclick="adminDashboard.generateProposalPDF('${proposal.id}')">
            <i class="fas fa-file-pdf"></i> Gerar PDF
          </button>
          <button class="btn btn-primary" onclick="adminDashboard.closeModal()">
            <i class="fas fa-times"></i> Fechar
          </button>
        `;

        // Botão de Editar liberado para Administrador e para o próprio Especialista da proposta
        actionButtons += `
          <button class="btn btn-outline" onclick="adminDashboard.editProposal('${proposal.id}')">
            <i class="fas fa-edit"></i> Editar
          </button>
        `;

        // Botão de Excluir apenas para Administrador
        if (this.user.user_type.toLowerCase() === 'administrador') {
          actionButtons += `
            <button class="btn btn-danger" onclick="adminDashboard.openDeleteProposalModal('${proposal.id}', '${proposal.client_name}')">
              <i class="fas fa-trash"></i> Excluir Proposta
            </button>
          `;
        }
      }

      const modal = document.getElementById("proposalModal");
      const modalContent = document.getElementById("proposalModalContent");

      modalContent.innerHTML = `
        <div class="modal-header">
          <h2>Proposta #${proposal.id} ${this.getBankBadge(proposal.bank_name)}</h2>
          <button class="close-btn" onclick="adminDashboard.closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="proposal-details-grid">
            <div class="detail-section">
              <h3>Informações do Cliente</h3>
	              <p><strong>Nome do cliente:</strong> ${proposal.client_name}</p>
	              <p><strong>Tipo:</strong> ${proposal.client_type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
	              <p><strong>Data de nascimento:</strong> ${proposal.client_birth_date ? new Date(proposal.client_birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
	              <p><strong>Naturalidade:</strong> ${proposal.client_naturalidade || 'N/A'}</p>
	              <p><strong>Filiação:</strong> Mãe: ${proposal.client_mother_name || 'N/A'} / Pai: ${proposal.client_father_name || 'N/A'}</p>
	              <p><strong>CPF:</strong> ${proposal.client_cpf || 'N/A'} ${proposal.client_cpf ? `<button class="btn btn-sm btn-info" onclick="adminDashboard.openCPFConsultation('${proposal.client_cpf}', '${proposal.client_birth_date}')" style="margin-left: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.75rem;"><i class="fas fa-external-link-alt"></i> Consultar</button>` : ''}</p>
	              <p><strong>Número do RG:</strong> ${proposal.client_rg || 'N/A'}</p>
	              <p><strong>UF do documento:</strong> ${proposal.client_rg_uf || 'N/A'}</p>
	              <p><strong>Endereço:</strong> ${proposal.client_address || 'N/A'}</p>
	              <p><strong>CEP:</strong> ${proposal.client_cep || 'N/A'}</p>
	              <p><strong>Celular:</strong> ${proposal.client_phone || 'N/A'}</p>
	              <p><strong>Email:</strong> ${proposal.client_email || 'N/A'}</p>
	              <p><strong>Profissão:</strong> ${proposal.client_profession || 'N/A'}</p>
	              <p><strong>Renda:</strong> R$ ${Number.parseFloat(proposal.client_income || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
	              <p><strong>CNPJ:</strong> ${proposal.client_cnpj || 'N/A'} ${proposal.client_cnpj ? `<button class="btn btn-sm btn-info" onclick="adminDashboard.openCNPJConsultation('${proposal.client_cnpj}')" style="margin-left: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.75rem;"><i class="fas fa-external-link-alt"></i> Consultar</button>` : ''}</p>
	              <p><strong>Data Abertura Empresa:</strong> ${proposal.company_opening_date ? new Date(proposal.company_opening_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
	              <p><strong>Contato de referência:</strong> ${proposal.indicated_by || 'N/A'}</p>
	              <p><strong>Possui CNH na categoria?:</strong> ${proposal.client_has_cnh || proposal.has_cnh || 'Não informado'}</p>
              
              ${proposal.partners ? `
                <div style="margin-top: 1rem; padding: 0.5rem; background: #f8fafc; border-radius: 4px; border-left: 3px solid #3b82f6;">
                  <h4 style="font-size: 0.875rem; margin-bottom: 0.5rem;">Sócios:</h4>
	                  ${(typeof proposal.partners === 'string' ? JSON.parse(proposal.partners) : proposal.partners).map(p => `
	                    <div style="font-size: 0.8125rem; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px dashed #e2e8f0;">
	                      <strong>${p.name}</strong><br>
                        CPF: ${p.cpf || 'N/A'} | Nasc: ${p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A'}<br>
                        Tel: ${p.phone || 'N/A'} | Email: ${p.email || 'N/A'}<br>
                        Profissão: ${p.profession || 'N/A'} | Renda: ${p.income || 'N/A'}
	                    </div>
	                  `).join('')}
                </div>
              ` : ''}
            </div>

            <div class="detail-section">
              <h3>Informações do Veículo</h3>
              <p><strong>Tipo:</strong> ${this.decodeHTMLEntities(proposal.vehicle_type)}</p>
              <p><strong>Marca:</strong> ${proposal.vehicle_brand}</p>
              <p><strong>Modelo:</strong> ${proposal.vehicle_model}</p>
              <p><strong>Ano Fabricação:</strong> ${proposal.vehicle_year_manufacture || 'N/A'}</p>
              <p><strong>Ano Modelo:</strong> ${proposal.vehicle_year_model || 'N/A'}</p>
              <p><strong>Placa:</strong> ${proposal.vehicle_plate}</p>
              <p><strong>Valor:</strong> R$ ${Number.parseFloat(proposal.vehicle_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p><strong>Condição:</strong> ${proposal.vehicle_condition}</p>
            </div>

            <div class="detail-section">
              <h3>Informações Financeiras</h3>
              <p><strong>Valor do Financiamento:</strong> R$ ${Number.parseFloat(proposal.finance_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p><strong>Entrada:</strong> R$ ${Number.parseFloat(proposal.finance_entry || proposal.down_payment || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p><strong>Tipo de Produto:</strong> ${proposal.finance_product_type || proposal.product_type || 'N/A'}</p>
              <p><strong>Especialista:</strong> ${proposal.specialist || 'N/A'}</p>
              ${proposal.bank_name ? `<p><strong>Banco:</strong> ${this.getBankBadge(proposal.bank_name)}</p>` : ''}
              ${proposal.indicated_by ? `<p><strong>Indicado por:</strong> ${proposal.indicated_by}</p>` : ''}
              <p><strong>Status:</strong> <span class="status-badge status-${proposal.status}">${this.getStatusText(proposal.status)}</span></p>
              ${proposal.observation ? `<p><strong>Observação:</strong> ${proposal.observation}</p>` : ''}
              ${proposal.client_observation ? `<p><strong>Observação do Cliente:</strong> ${proposal.client_observation}</p>` : ''}
              <p><strong>Data da Proposta:</strong> ${proposal.data_proposta ? this.formatDateWithoutTimezone(proposal.data_proposta) : 'N/A'}</p>
              <p><strong>Data de Criação:</strong> ${new Date(proposal.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div class="proposal-actions">
            ${this.user.user_type.toLowerCase() === 'administrador' || this.normalizeUserType(this.user.user_type) === specialistKey
              ? actionButtons
              : `<button class="btn btn-primary" onclick="adminDashboard.closeModal()">Fechar</button>`
            }
          </div>
        </div>
      `;

      modal.style.display = "flex";
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      this.showNotification("Erro ao carregar detalhes da proposta", "error");
    }
  }

  closeModal() {
    const modal = document.getElementById("proposalModal");
    modal.style.display = "none";
  }

  editProposal(proposalId) {
    window.location.href = `edit-proposal.php?id=${proposalId}`;
  }

  /**
   * Gera um PDF com os detalhes da proposta
   */
  async generateProposalPDF(proposalId) {
    try {
      this.showNotification("Gerando PDF...", "info");
      
      const response = await fetch(`${this.apiEndpoint}?action=get_proposal_details&proposal_id=${proposalId}`);
      const data = await response.json();

      if (!data.success) {
        this.showNotification("Erro ao obter dados para o PDF", "error");
        return;
      }

      const proposal = data.data.proposal;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Configurações de estilo
      const margin = 20;
      let y = 20;
      
      // Cabeçalho
      doc.setFillColor(37, 99, 235); // Azul principal
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PROPOSTA DE FINANCIAMENTO", margin, 25);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`ID: #${proposal.id} | Data: ${new Date(proposal.created_at).toLocaleDateString('pt-BR')}`, margin, 33);
      
      y = 55;
      
      // Função auxiliar para seções
      const addSection = (title, data) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(margin - 5, y - 7, 180, 10, 'F');
        
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(title.toUpperCase(), margin, y);
        y += 12;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        
        data.forEach(item => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.text(`${item.label}:`, margin, y);
          doc.setFont("helvetica", "normal");
          doc.text(`${item.value || 'N/A'}`, margin + 50, y);
          y += 7;
        });
        y += 10;
      };

		      // Seção: Cliente
		      const clientData = [
		        { label: "Nome do cliente", value: proposal.client_name },
		        { label: "Tipo", value: proposal.client_type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física' },
		        { label: "Data de nascimento", value: proposal.client_birth_date ? new Date(proposal.client_birth_date).toLocaleDateString('pt-BR') : 'N/A' },
		        { label: "Naturalidade", value: proposal.client_naturalidade || 'N/A' },
		        { label: "Filiação", value: `Mãe: ${proposal.client_mother_name || 'N/A'} / Pai: ${proposal.client_father_name || 'N/A'}` },
		        { label: "CPF", value: proposal.client_cpf || 'N/A' },
		        { label: "Número do RG", value: proposal.client_rg || 'N/A' },
		        { label: "UF do documento", value: proposal.client_rg_uf || 'N/A' },
		        { label: "Endereço", value: proposal.client_address || 'N/A' },
		        { label: "CEP", value: proposal.client_cep || 'N/A' },
		        { label: "Celular", value: proposal.client_phone || 'N/A' },
		        { label: "Email", value: proposal.client_email || 'N/A' },
		        { label: "Profissão", value: proposal.client_profession || 'N/A' },
		        { label: "Renda", value: `R$ ${Number.parseFloat(proposal.client_income || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
		        { label: "CNPJ", value: proposal.client_cnpj || 'N/A' },
		        { label: "Data Abertura Empresa", value: proposal.company_opening_date ? new Date(proposal.company_opening_date).toLocaleDateString('pt-BR') : 'N/A' },
		        { label: "Contato de referência", value: proposal.indicated_by || 'N/A' },
		        { label: "Possui CNH na categoria?", value: proposal.client_has_cnh || proposal.has_cnh || 'Não informado' }
		      ];

      addSection("Informações do Cliente", clientData);

		      // Seção: Informações da Empresa (para PJ)
	      if (proposal.client_type === 'pj') {
        const companyData = [];
        if (proposal.client_cnpj) companyData.push({ label: "CNPJ", value: proposal.client_cnpj });
        if (proposal.company_opening_date) companyData.push({ label: "Data de Abertura", value: this.formatDateWithoutTimezone(proposal.company_opening_date) });
        if (companyData.length > 0) addSection("Informações da Empresa", companyData);
      }

      // Seção: Sócios (Apenas se for PJ)
      if (proposal.client_type === 'pj' && proposal.partners) {
        try {
          const partners = typeof proposal.partners === 'string' ? JSON.parse(proposal.partners) : proposal.partners;
          if (partners && partners.length > 0) {
            const partnersData = [];
            partners.forEach((p, index) => {
              partnersData.push({ label: `Sócio ${index + 1}`, value: `${p.name}` });
              partnersData.push({ label: `  - CPF/Nasc`, value: `${p.cpf || 'N/A'} | ${p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A'}` });
              partnersData.push({ label: `  - Contato`, value: `${p.phone || 'N/A'} | ${p.email || 'N/A'}` });
              partnersData.push({ label: `  - Profissão/Renda`, value: `${p.profession || 'N/A'} | ${p.income || 'N/A'}` });
            });
            addSection("Dados dos Sócios", partnersData);
          }
        } catch (e) {
          console.error("Erro ao processar sócios para o PDF", e);
        }
      }

      // Seção: Veículo
      addSection("Informações do Veículo", [
        { label: "Tipo", value: proposal.vehicle_type },
        { label: "Marca/Modelo", value: `${proposal.vehicle_brand} ${proposal.vehicle_model}` },
        { label: "Ano Fab/Mod", value: `${proposal.vehicle_year_manufacture}/${proposal.vehicle_year_model}` },
        { label: "Placa", value: proposal.vehicle_plate },
        { label: "Valor do Veículo", value: `R$ ${Number.parseFloat(proposal.vehicle_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        { label: "Condição", value: proposal.vehicle_condition }
      ]);

      // Seção: Financeiro
      addSection("Informações Financeiras", [
        { label: "Valor Financiado", value: `R$ ${Number.parseFloat(proposal.finance_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        { label: "Entrada", value: `R$ ${Number.parseFloat(proposal.finance_entry || proposal.down_payment || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        { label: "Produto", value: proposal.finance_product_type || proposal.product_type || 'N/A' },
        { label: "Banco", value: proposal.bank_name || 'Em análise' },
        { label: "Status Atual", value: this.getStatusText(proposal.status) },
        { label: "Especialista", value: proposal.specialist }
      ]);

      if (proposal.observation || proposal.client_observation) {
        const obsData = [];
        if (proposal.observation) obsData.push({ label: "Obs. Admin", value: proposal.observation });
        if (proposal.client_observation) obsData.push({ label: "Obs. Cliente", value: proposal.client_observation });
        addSection("Observações", obsData);
      }

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Documento gerado automaticamente pelo sistema CCAPI.", 105, 285, { align: "center" });

      if (window.__TAURI__) {
        const { save } = window.__TAURI__.dialog;
        const { writeFile } = window.__TAURI__.fs;
        const pdfOutput = doc.output('arraybuffer');
        try {
          const outputPath = await save({
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
            defaultPath: `Proposta_${proposal.id}_${proposal.client_name.replace(/\s+/g, '_')}.pdf`
          });
          if (outputPath) {
            await writeFile(outputPath, new Uint8Array(pdfOutput));
            this.showNotification("PDF guardado com sucesso!", "success");
          }
        } catch (err) {
          console.error("Erro ao guardar PDF via Tauri:", err);
          this.showNotification("Erro ao guardar o ficheiro", "error");
        }
      } else {
        doc.save(`Proposta_${proposal.id}_${proposal.client_name.replace(/\s+/g, '_')}.pdf`);
        this.showNotification("PDF gerado com sucesso!", "success");
      }
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      this.showNotification("Erro ao gerar PDF", "error");
    }
  }

  // ============ FUNÇÕES PARA ANEXAR DOCUMENTOS ÀS PROPOSTAS ============

  /**
   * Abrir modal para anexar documento à proposta
   */
  openAttachDocumentModal(proposalId, clientName) {
    const modal = document.getElementById('attachProposalDocumentModal');
    if (!modal) {
      this.showNotification('Modal de anexo não encontrado', 'error');
      return;
    }

    // Preencher dados da proposta
    const idField = document.getElementById('attachProposalId');
    const nameField = document.getElementById('attachClientName');
    
    if (idField) idField.value = proposalId;
    if (nameField) nameField.value = clientName;

    // Limpar campos
    const typeField = document.getElementById('attachDocumentType');
    const fileField = document.getElementById('attachDocumentFile');
    
    if (typeField) typeField.value = '';
    if (fileField) fileField.value = '';

    modal.style.display = 'flex';
  }

  /**
   * Fechar modal de anexar documento
   */
  closeAttachDocumentModal() {
    const modal = document.getElementById('attachProposalDocumentModal');
    if (modal) {
      modal.style.display = 'none';
      // Limpar formulário
      const form = document.getElementById('attachProposalDocumentForm');
      if (form) form.reset();
    }
  }

  /**
   * Submeter documento anexado à proposta
   */
  async submitAttachDocument(event) {
    const form = document.getElementById('attachProposalDocumentForm');
    if (!form) {
      this.showNotification('Formulário não encontrado', 'error');
      return;
    }

    const proposalId = document.getElementById('attachProposalId').value;
    const fileInput = document.getElementById('attachDocumentFile');
    const folderInput = document.getElementById('attachDocumentFolder');

    // Validações
    if (!proposalId) {
      this.showNotification('ID da proposta não encontrado', 'error');
      return;
    }

    // Combinar arquivos de ambos os inputs
    let allFiles = [];
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      allFiles = [...allFiles, ...Array.from(fileInput.files)];
    }
    if (folderInput && folderInput.files && folderInput.files.length > 0) {
      allFiles = [...allFiles, ...Array.from(folderInput.files)];
    }

    // Suporte para Tauri se nenhum arquivo foi selecionado via input
    if (allFiles.length === 0 && window.__TAURI__) {
      const file = await tauriOpenFile([
        { name: 'Documentos', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'] }
      ]);
      if (file) allFiles.push(file);
    }

    if (allFiles.length === 0) {
      this.showNotification('Por favor, selecione ao menos um arquivo ou pasta', 'error');
      return;
    }

    // Desabilitar botão de envio
    const submitBtn = event ? (event.target.closest('button') || event.target) : null;
    let originalText = '';
    if (submitBtn) {
      originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    }

    try {
      const maxSize = 50 * 1024 * 1024; // 50MB
      let successCount = 0;
      let errorMessages = [];

      // Enviar cada arquivo individualmente para a API
      for (const file of allFiles) {
        if (file.size > maxSize) {
          errorMessages.push(`Arquivo "${file.name}" muito grande (máx 50MB)`);
          continue;
        }

        const formData = new FormData();
        formData.append('action', 'upload_proposal_document');
        formData.append('proposal_id', proposalId);
        formData.append('document_type', 'Outros'); // Define um tipo padrão para evitar erro de coluna nula
        formData.append('document', file); // O PHP espera 'document'

        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          errorMessages.push(`Erro no arquivo "${file.name}": ${data.error || 'Erro desconhecido'}`);
        }
      }

      if (successCount > 0) {
        this.showNotification(`${successCount} arquivo(s) anexado(s) com sucesso!`, 'success');
        this.closeAttachDocumentModal();

        // Atualizar lista de documentos se estiver na aba de documentos
        if (document.querySelector('[data-tab="documentos"].active')) {
          this.loadClientDocuments();
        }

        // Se estiver na seção de especialista, também atualizar
        const userType = this.normalizeUserType(this.user.user_type);
        if (userType !== 'administrador') {
          const specialistKey = userType.toLowerCase();
          if (typeof this.loadSpecialistDocuments === 'function') {
            this.loadSpecialistDocuments(specialistKey, userType);
          }
        }
      }

      if (errorMessages.length > 0) {
        console.error('Erros no upload:', errorMessages);
        if (successCount === 0) {
          this.showNotification(errorMessages[0], 'error');
        } else {
          this.showNotification(`Alguns arquivos falharam. Verifique o console.`, 'warning');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      this.showNotification('Erro de conexão ao enviar documento', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  }


  /**
   * ============ FUNÇÕES PARA ADICIONAR NOVA PROPOSTA ============
   */

  /**
   * Abrir modal de adicionar proposta
   */
  openAddProposalModal() {
    const modal = document.getElementById('addProposalModal');
    if (modal) {
      modal.style.display = 'flex';
      
      // Limpar formulário
      const form = document.getElementById('addProposalForm');
      if (form) form.reset();
      
      // Aplicar máscaras após abrir o modal
      setTimeout(() => this.applyMasks(), 100);
      
      // Configurar autocomplete de CEP
      setTimeout(() => this.setupCEPAutocomplete(), 150);
    }
  }

  /**
   * Configurar autocomplete de CEP
   */
  setupCEPAutocomplete() {
    const cepInput = document.getElementById('newClientCep');
    if (!cepInput) return;
    
    // Remover event listener anterior se existir
    cepInput.removeEventListener('blur', this.handleCEPBlur);
    
    // Adicionar novo event listener com bind para manter o contexto
    cepInput.addEventListener('blur', this.handleCEPBlur.bind(this));
  }

  /**
   * Buscar endereco via CEP usando API ViaCEP
   */
  async handleCEPBlur(event) {
    const cepInput = event.target;
    const addressInput = document.getElementById('newClientAddress');
    
    if (!addressInput) return;
    
    let cep = cepInput.value.replace(/\D/g, '');
    
    // Validar se o CEP tem 8 digitos
    if (cep.length !== 8) {
      addressInput.value = '';
      return;
    }
    
    try {
      // Mostrar loading
      addressInput.value = 'Buscando endereco...';
      addressInput.style.color = '#64748b';
      
      // Fazer requisicao a API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      // Verificar se o CEP eh valido
      if (data.erro) {
        addressInput.value = 'CEP nao encontrado';
        addressInput.style.color = '#dc2626';
        setTimeout(() => {
          addressInput.value = '';
          addressInput.style.color = '';
        }, 2000);
        return;
      }
      
      // Montar o endereco completo
      const endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
      addressInput.value = endereco;
      addressInput.style.color = '';
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      addressInput.value = 'Erro ao buscar CEP';
      addressInput.style.color = '#dc2626';
      setTimeout(() => {
        addressInput.value = '';
        addressInput.style.color = '';
      }, 2000);
    }
  }

  /**
   * Fechar modal de adicionar proposta
   */
  closeAddProposalModal() {
    const modal = document.getElementById('addProposalModal');
    if (modal) {
      modal.style.display = 'none';
      
      // Limpar formulário
      const form = document.getElementById('addProposalForm');
      if (form) form.reset();
    }
  }

  /**
   * Formatar valores monetários para envio
   */
  parseMoneyValue(value) {
    if (!value) return 0;
    // Remove R$, pontos e espaços, e substitui vírgula por ponto
    return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  }

  _cnpjPFDebounceTimer = null;

  handleCNPJInputPF(rawValue) {
    const onlyDigits = rawValue.replace(/\D/g, '').slice(0, 14);
    let formatted = onlyDigits;
    if (onlyDigits.length > 2)  formatted = onlyDigits.slice(0,2) + '.' + onlyDigits.slice(2);
    if (onlyDigits.length > 5)  formatted = formatted.slice(0,6) + '.' + onlyDigits.slice(5);
    if (onlyDigits.length > 8)  formatted = formatted.slice(0,10) + '/' + onlyDigits.slice(8);
    if (onlyDigits.length > 12) formatted = formatted.slice(0,15) + '-' + onlyDigits.slice(12);

    const input = document.getElementById('newClientCNPJ_PF');
    if (input && input.value !== formatted) input.value = formatted;

    const spinner  = document.getElementById('cnpjPFLoadingSpinner');
    const statusEl = document.getElementById('cnpjPFStatusIcon');
    const feedback = document.getElementById('cnpjPFFeedback');

    if (onlyDigits.length < 14) {
      if (spinner)  spinner.style.display  = 'none';
      if (statusEl) statusEl.style.display = 'none';
      if (feedback) feedback.style.display = 'none';
      clearTimeout(this._cnpjPFDebounceTimer);
      return;
    }

    clearTimeout(this._cnpjPFDebounceTimer);
    this._cnpjPFDebounceTimer = setTimeout(() => this._fetchCNPJPF(onlyDigits), 800);
  }

  async _fetchCNPJPF(cnpj) {
    const spinner  = document.getElementById('cnpjPFLoadingSpinner');
    const statusEl = document.getElementById('cnpjPFStatusIcon');
    const feedback = document.getElementById('cnpjPFFeedback');

    if (spinner)  { spinner.style.display  = 'inline'; }
    if (statusEl) { statusEl.style.display = 'none'; }
    if (feedback) { feedback.style.display = 'none'; }

    try {
      const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();

      if (spinner) spinner.style.display = 'none';

      if (!res.ok || data.type === 'not_found' || !data.razao_social) {
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#dc2626;"></i>'; statusEl.style.display = 'inline'; }
        if (feedback) { feedback.textContent = data.message || 'CNPJ não encontrado.'; feedback.style.color = '#dc2626'; feedback.style.display = 'block'; }
        return;
      }

      if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;"></i>'; statusEl.style.display = 'inline'; }
      if (feedback) { feedback.textContent = 'Dados preenchidos automaticamente!'; feedback.style.color = '#16a34a'; feedback.style.display = 'block'; }

      // CEP
      if (data.cep) {
        const cepField = document.getElementById('newClientCep');
        const cepFormatado = data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
        if (cepField) cepField.value = cepFormatado;
      }

      // Endereço completo
      const addrParts = [];
      if (data.descricao_tipo_de_logradouro) addrParts.push(data.descricao_tipo_de_logradouro);
      if (data.logradouro)   addrParts.push(data.logradouro);
      if (data.numero)       addrParts.push(data.numero);
      if (data.complemento && data.complemento.trim()) addrParts.push(data.complemento.trim());
      if (data.bairro)       addrParts.push(data.bairro);
      if (data.municipio)    addrParts.push(data.municipio);
      if (data.uf)           addrParts.push(data.uf);

      if (addrParts.length > 0) {
        const addrField = document.getElementById('newClientAddress');
        if (addrField) addrField.value = addrParts.join(', ');
      }

    } catch (err) {
      if (spinner)  spinner.style.display  = 'none';
      if (statusEl) { statusEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i>'; statusEl.style.display = 'inline'; }
      if (feedback) { feedback.textContent = 'Não foi possível buscar o CNPJ. Preencha manualmente.'; feedback.style.color = '#f59e0b'; feedback.style.display = 'block'; }
      console.warn('Erro ao buscar CNPJ PF:', err);
    }
  }

  _cnpjDebounceTimer = null;

  handleCNPJInput(rawValue) {
    // Formata o CNPJ enquanto o usuário digita
    const onlyDigits = rawValue.replace(/\D/g, '').slice(0, 14);
    let formatted = onlyDigits;
    if (onlyDigits.length > 2)  formatted = onlyDigits.slice(0,2) + '.' + onlyDigits.slice(2);
    if (onlyDigits.length > 5)  formatted = formatted.slice(0,6) + '.' + onlyDigits.slice(5);
    if (onlyDigits.length > 8)  formatted = formatted.slice(0,10) + '/' + onlyDigits.slice(8);
    if (onlyDigits.length > 12) formatted = formatted.slice(0,15) + '-' + onlyDigits.slice(12);

    const input = document.getElementById('newClientCNPJ');
    if (input && input.value !== formatted) input.value = formatted;

    const spinner  = document.getElementById('cnpjLoadingSpinner');
    const statusEl = document.getElementById('cnpjStatusIcon');
    const feedback = document.getElementById('cnpjFeedback');

    if (onlyDigits.length < 14) {
      if (spinner)  spinner.style.display  = 'none';
      if (statusEl) statusEl.style.display = 'none';
      if (feedback) feedback.style.display = 'none';
      clearTimeout(this._cnpjDebounceTimer);
      return;
    }

    // Espera 800ms após o usuário parar de digitar
    clearTimeout(this._cnpjDebounceTimer);
    this._cnpjDebounceTimer = setTimeout(() => this._fetchCNPJ(onlyDigits), 800);
  }

  async _fetchCNPJ(cnpj) {
    const spinner  = document.getElementById('cnpjLoadingSpinner');
    const statusEl = document.getElementById('cnpjStatusIcon');
    const feedback = document.getElementById('cnpjFeedback');

    if (spinner)  { spinner.style.display  = 'inline'; }
    if (statusEl) { statusEl.style.display = 'none'; }
    if (feedback) { feedback.style.display = 'none'; }

    try {
      const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = await res.json();

      if (spinner) spinner.style.display = 'none';

      if (!res.ok || data.type === 'not_found' || !data.razao_social) {
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#dc2626;"></i>'; statusEl.style.display = 'inline'; }
        if (feedback) { feedback.textContent = data.message || 'CNPJ não encontrado.'; feedback.style.color = '#dc2626'; feedback.style.display = 'block'; }
        return;
      }

      // ✅ CNPJ encontrado — preencher campos
      if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a;"></i>'; statusEl.style.display = 'inline'; }
      if (feedback) { feedback.textContent = 'Dados preenchidos automaticamente!'; feedback.style.color = '#16a34a'; feedback.style.display = 'block'; }

      // Razão Social
      const companyName = document.getElementById('newClientCompanyName');
      if (companyName) companyName.value = data.razao_social || '';

      // Data de Abertura — BrasilAPI retorna AAAA-MM-DD diretamente
      if (data.data_inicio_atividade) {
        const openingDate = document.getElementById('newClientOpeningDate');
        if (openingDate) openingDate.value = data.data_inicio_atividade;
      }

      // Telefone — BrasilAPI retorna ddd_telefone_1
      if (data.ddd_telefone_1) {
        const phone = document.getElementById('newClientPhone');
        if (phone) {
          const ddd = data.ddd_telefone_1.trim();
          phone.value = ddd.length >= 10 ? `(${ddd.slice(0,2)}) ${ddd.slice(2,7)}-${ddd.slice(7)}` : ddd;
        }
      }

      // Email
      if (data.email) {
        const emailField = document.getElementById('newClientEmail');
        if (emailField) emailField.value = data.email;
      }

      // CEP
      if (data.cep) {
        const cepField = document.getElementById('newClientCep');
        const cepFormatado = data.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
        if (cepField) cepField.value = cepFormatado;
      }

      // Endereço completo
      const addrParts = [];
      if (data.descricao_tipo_de_logradouro) addrParts.push(data.descricao_tipo_de_logradouro);
      if (data.logradouro)   addrParts.push(data.logradouro);
      if (data.numero)       addrParts.push(data.numero);
      if (data.complemento && data.complemento.trim()) addrParts.push(data.complemento.trim());
      if (data.bairro)       addrParts.push(data.bairro);
      if (data.municipio)    addrParts.push(data.municipio);
      if (data.uf)           addrParts.push(data.uf);

      if (addrParts.length > 0) {
        const addrField = document.getElementById('newClientAddress');
        if (addrField) addrField.value = addrParts.join(', ');
      }

      // Sócios — BrasilAPI retorna qsa com nome_socio e cnpj_cpf_do_socio
      if (data.qsa && data.qsa.length > 0) {
        const partnersContainer = document.getElementById('partnersContainer');
        if (partnersContainer) {
          partnersContainer.innerHTML = '';
          data.qsa.forEach(socio => {
            this.addPartner();
            const items = partnersContainer.querySelectorAll('.partner-item');
            const last  = items[items.length - 1];
            if (!last) return;
            const nameInput = last.querySelector('.partner-name');
            const cpfInput  = last.querySelector('.partner-cpf');
            if (nameInput) nameInput.value = socio.nome_socio || '';
            if (cpfInput && socio.cnpj_cpf_do_socio) cpfInput.value = socio.cnpj_cpf_do_socio;
          });
        }
      }

    } catch (err) {
      if (spinner)  spinner.style.display  = 'none';
      if (statusEl) { statusEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i>'; statusEl.style.display = 'inline'; }
      if (feedback) { feedback.textContent = 'Não foi possível buscar o CNPJ. Preencha manualmente.'; feedback.style.color = '#f59e0b'; feedback.style.display = 'block'; }
      console.warn('Erro ao buscar CNPJ:', err);
    }
  }

  /**
   * Submeter nova proposta
   */
  switchClientType(type) {
    const pfForm = document.getElementById('pfForm');
    const pjForm = document.getElementById('pjForm');
    const btns = document.querySelectorAll('.client-type-btn');
    
    btns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.client-type-btn[data-type="${type}"]`).classList.add('active');
    
    if (type === 'pf') {
      pfForm.style.display = 'block';
      pjForm.style.display = 'none';
      this.currentClientType = 'pf';
    } else {
      pfForm.style.display = 'none';
      pjForm.style.display = 'block';
      this.currentClientType = 'pj';
    }
  }

  addPartner() {
    const container = document.getElementById('partnersContainer');
    const partnerId = Date.now();
    const partnerHtml = `
      <div class="partner-item" id="partner_${partnerId}">
        <span class="remove-partner" onclick="document.getElementById('partner_${partnerId}').remove()"><i class="fas fa-times"></i></span>
        <div class="form-grid">
          <div class="form-group">
            <label>Nome Completo</label>
            <input type="text" class="partner-name" placeholder="Nome do sócio">
          </div>
          <div class="form-group">
            <label>CPF</label>
            <input type="text" class="partner-cpf" placeholder="000.000.000-00">
          </div>
          <div class="form-group">
            <label>Data de Nascimento</label>
            <input type="date" class="partner-birth">
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input type="tel" class="partner-phone" placeholder="(00) 00000-0000">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" class="partner-email" placeholder="email@exemplo.com">
          </div>
          <div class="form-group">
            <label>Profissão</label>
            <input type="text" class="partner-profession" placeholder="Profissão">
          </div>
          <div class="form-group">
            <label>Renda</label>
            <input type="text" class="partner-income" placeholder="R$ 0,00">
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', partnerHtml);
  }

  async submitNewProposal() {
    const form = document.getElementById('addProposalForm');
    if (!form) {
      this.showNotification('Formulário não encontrado', 'error');
      return;
    }

    try {
      // Coletar dados do formulário com segurança
      const isPJ = this.currentClientType === 'pj';
      
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
      };

      const clientName = isPJ ? getVal('newClientCompanyName') : getVal('newClientName');
      
      let clientDocument = '';
      let clientCPF = '';
      let clientCNPJ = '';
      
      if (isPJ) {
        clientDocument = getVal('newClientCNPJ');
      } else {
        clientCPF = getVal('newClientCPF');
        clientCNPJ = getVal('newClientCNPJ_PF');
        clientDocument = clientCPF || clientCNPJ;
      }
      
      const partners = [];
      if (isPJ) {
        document.querySelectorAll('.partner-item').forEach(item => {
          const pName = item.querySelector('.partner-name');
          const pCpf = item.querySelector('.partner-cpf');
          const pBirth = item.querySelector('.partner-birth');
          const pPhone = item.querySelector('.partner-phone');
          const pEmail = item.querySelector('.partner-email');
          const pProfession = item.querySelector('.partner-profession');
          const pIncome = item.querySelector('.partner-income');
          
          partners.push({
            name: pName ? pName.value.trim() : '',
            cpf: pCpf ? pCpf.value.trim() : '',
            birth_date: pBirth ? pBirth.value : '',
            phone: pPhone ? pPhone.value.trim() : '',
            email: pEmail ? pEmail.value.trim() : '',
            profession: pProfession ? pProfession.value.trim() : '',
            income: pIncome ? pIncome.value.trim() : ''
          });
        });
      }

      const formData = {
        action: 'create_proposal',
        origin: 'admin',
        client_type: this.currentClientType || 'pf',
        client_name: clientName,
        client_document: clientDocument,
        client_cpf: clientCPF,
        client_cnpj: clientCNPJ,
        company_opening_date: isPJ ? getVal('newClientOpeningDate') : '',
        partners: JSON.stringify(partners),
        client_phone: getVal('newClientPhone'),
        client_email: getVal('newClientEmail'),
        client_birth_date: getVal('newClientBirthDate'),
        client_naturalidade: getVal('newClientNaturalidade'),
        client_mother_name: getVal('newClientMotherName'),
        client_father_name: getVal('newClientFatherName'),
        client_rg: getVal('newClientRG'),
        client_rg_uf: getVal('newClientRG_UF'),
        client_profession: getVal('newClientProfession'),
        client_income: this.parseMoneyValue(getVal('newClientIncome')),
        client_cep: getVal('newClientCep'),
        client_address: getVal('newClientAddress'),
        client_has_cnh: getVal('newClientHasCnh'),
        vehicle_type: getVal('newVehicleType'),
        vehicle_brand: getVal('newVehicleBrand'),
        vehicle_model: getVal('newVehicleModel'),
        vehicle_year_manufacture: getVal('newVehicleYearManufacture'),
        vehicle_year_model: getVal('newVehicleYearModel'),
        vehicle_value: this.parseMoneyValue(getVal('newVehicleValue')),
        vehicle_plate: getVal('newVehiclePlate'),
        vehicle_condition: getVal('newVehicleCondition'),
        
        finance_value: this.parseMoneyValue(getVal('newFinanceValue')),
        finance_entry: this.parseMoneyValue(getVal('newFinanceEntry')),
        finance_product_type: getVal('newFinanceProductType'),
        bank_name: getVal('newBankName'),
        indicated_by: getVal('newClientIndicatedBy'),
        
        specialist: getVal('newSpecialist'),
        observation: getVal('newObservation'),
        data_proposta: getVal('newDataProposta')
      };

      // Validação básica
      if (!formData.client_name) {
        this.showNotification('Por favor, preencha o nome do cliente', 'error');
        document.getElementById('newClientName')?.focus();
        return;
      }

      if (!formData.client_document) {
        this.showNotification('Por favor, preencha o CPF ou o CNPJ do cliente', 'error');
        const docEl = isPJ ? document.getElementById('newClientCNPJ') : document.getElementById('newClientCPF');
        if (docEl) docEl.focus();
        return;
      }

      if (!formData.client_has_cnh) {
        this.showNotification('Por favor, informe se o cliente possui CNH', 'error');
        document.getElementById('newClientHasCnh')?.focus();
        return;
      }

      if (!formData.vehicle_type) {
        this.showNotification('Por favor, selecione o tipo do veículo', 'error');
        document.getElementById('newVehicleType')?.focus();
        return;
      }

      // Mostrar loading
      this.showNotification('Criando proposta...', 'info');

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Proposta criada com sucesso e está em análise!', 'success');
        this.closeAddProposalModal();
        
        // Recarregar lista de propostas
        await this.loadDashboardData();
        
        // Se estiver na seção de especialista, recarregar também
        const userType = this.normalizeUserType(this.user.user_type);
        if (userType !== 'administrador' && this.currentSection !== 'overview') {
          await this.loadSpecialistProposals(this.currentSection);
        }
      } else {
        this.showNotification(data.error || 'Erro ao criar proposta', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar proposta:', error);
      this.showNotification('Erro ao processar dados do formulário', 'error');
    }
  }


  /**
   * Adicionar botão de anexar documento ao modal de detalhes da proposta
   * Esta função deve ser chamada ao renderizar os detalhes da proposta
   */
  addAttachDocumentButton(proposalId, clientName) {
    // Procurar o modal de detalhes da proposta (adaptado para o ID correto)
    const modal = document.getElementById('proposalModal');
    if (!modal) return;

    const modalFooter = modal.querySelector('.proposal-actions');
    if (!modalFooter) return;

    // Verificar se o botão já existe
    let attachBtn = modalFooter.querySelector('.btn-attach-document');

    if (!attachBtn) {
      // Criar botão de anexar documento
      attachBtn = document.createElement('button');
      attachBtn.className = 'btn btn-success btn-attach-document';
      attachBtn.innerHTML = '<i class="fas fa-paperclip"></i> Anexar Documento';
      attachBtn.onclick = () => this.openAttachDocumentModal(proposalId, clientName);

      // Inserir antes do botão de fechar (normalmente o último)
      const closeBtn = modalFooter.querySelector('.btn-primary');
      if (closeBtn) {
        modalFooter.insertBefore(attachBtn, closeBtn);
      } else {
        modalFooter.appendChild(attachBtn);
      }
    } else {
      // Atualizar o onclick com os novos dados
      attachBtn.onclick = () => this.openAttachDocumentModal(proposalId, clientName);
    }
  }

  // FUNÇÃO CORRIGIDA: Lidar com mudança de status (ABRE MODAL DE BANCO SE FORMALIZADA)
  handleProposalStatusChange(proposalId, newStatus, specialistKey = null) {
    this.currentProposalId = proposalId;
    this.pendingStatusChange = newStatus;
    this.currentSpecialist = specialistKey;

    // Se o status for "formalizada", abrir modal de seleção de banco
    if (newStatus === "formalizada") {
      // Resetar seleção anterior
      this.pendingBankSelection = null;
      document.querySelectorAll('[data-bank]').forEach(option => {
        option.classList.remove('active');
      });
      
      // Abrir o modal correto
      const bankModal = document.getElementById("bankSelectionModal");
      if (bankModal) {
        bankModal.style.display = "flex";
      } else {
        console.error('Modal bankSelectionModal não encontrado!');
        this.showNotification('Erro: Modal de seleção de banco não encontrado', 'error');
      }
      return;
    }

    // Para outros status, continuar com o fluxo normal de observação
    if (newStatus === "rejected" || newStatus === "pending" || newStatus === "approved" || newStatus === "analyzing") {
      document.getElementById("observationText").value = "";
      document.getElementById("observationModal").style.display = "flex";
    } else {
      this.updateProposalStatus(proposalId, newStatus, null, specialistKey);
    }
  }

  confirmObservationAndChangeStatus() {
    const observation = document.getElementById("observationText").value;

    // Se o status for formalizada, validar observação e banco
    if (this.pendingStatusChange === "formalizada") {
      if (!observation.trim()) {
        this.showNotification("Por favor, adicione uma observação.", "error");
        return;
      }
      if (!this.pendingBankSelection) {
        this.showNotification("Erro: Nenhum banco foi selecionado.", "error");
        return;
      }
    }

    // Para outros status, validar apenas se requerem observação
    if ((this.pendingStatusChange === "rejected" || this.pendingStatusChange === "pending" ||
         this.pendingStatusChange === "approved" || this.pendingStatusChange === "analyzing") &&
        !observation.trim()) {
      this.showNotification("Por favor, adicione uma observação para este status.", "error");
      return;
    }

    document.getElementById("observationModal").style.display = "none";

    // Salvar o banco temporariamente antes de resetar
    const selectedBank = this.pendingBankSelection;

    // Atualizar status com banco (se formalizada) e observação
    this.updateProposalStatus(
      this.currentProposalId,
      this.pendingStatusChange,
      observation,
      this.currentSpecialist,
      selectedBank
    );

    // Resetar seleções de banco após envio
    this.pendingBankSelection = null;
    document.querySelectorAll('[data-bank]').forEach(option => {
      option.classList.remove('active');
    });
  }

  // FUNÇÃO ATUALIZADA: Atualizar status da proposta (COM BANCO)
  async updateProposalStatus(proposalId, status, observation, specialistKey, bankName = null) {
    try {
      if (!specialistKey && this.user.user_type.toLowerCase() !== 'administrador') {
          specialistKey = this.normalizeUserType(this.user.user_type);
      }

      const requestBody = {
        action: "update_proposal_status",
        proposal_id: proposalId,
        status: status,
        observation: observation,
        specialist: specialistKey,
      };

      // NOVO: Adicionar bank_name se fornecido
      if (bankName) {
        requestBody.bank_name = bankName;
      }

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Proposta criada com sucesso!', 'success');
        this.closeAddProposalModal();
        this.loadDashboardData();
        // Atualizar painel se estiver aberto
        if (document.getElementById('painelOverlay')?.style.display === 'block') {
            const activeBank = document.querySelector('.game-bank-btn.active')?.dataset.bank;
            if (activeBank) this.loadPainelBank(activeBank);
        }
      } else {
        this.showNotification(data.error || 'Erro ao criar proposta', 'error');
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.showNotification("Erro de conexão ao atualizar status da proposta.", "error");
    }
  }

  setupAdminChat() {
    const sendMessageBtn = document.getElementById('sendAdminMessageBtn');
    const messageInput = document.getElementById('adminMessageInput');
    const closeChatBtn = document.getElementById('closeAdminChatBtn');

    if (sendMessageBtn) {
      sendMessageBtn.addEventListener('click', () => this.sendAdminMessage());
    }

    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendAdminMessage();
        }
      });
    }

    if (closeChatBtn) {
      closeChatBtn.addEventListener('click', () => {
        const chatWindow = document.getElementById('adminChatWindow');
        if (chatWindow) {
          chatWindow.style.display = 'none';
        }

        this.currentAdminConversationId = null;

        if (this.adminChatPollingInterval) {
          clearInterval(this.adminChatPollingInterval);
          this.adminChatPollingInterval = null;
        }
      });
    }
  }

  setupNewChatModal() {
    const startNewChatBtn = document.getElementById('startNewChatBtn');
    const closeNewChatModal = document.getElementById('closeNewChatModal');
    const cancelNewChat = document.getElementById('cancelNewChat');
    const confirmNewChat = document.getElementById('confirmNewChat');
    const selectUser = document.getElementById('selectUser');

    if (startNewChatBtn) {
      startNewChatBtn.addEventListener('click', () => this.openNewChatModal());
    }

    if (closeNewChatModal) {
      closeNewChatModal.addEventListener('click', () => this.closeNewChatModal());
    }

    if (cancelNewChat) {
      cancelNewChat.addEventListener('click', () => this.closeNewChatModal());
    }

    if (confirmNewChat) {
      confirmNewChat.addEventListener('click', () => this.createNewChat());
    }

    if (selectUser) {
      selectUser.addEventListener('change', (e) => this.loadUserProposals(e.target.value));
    }
  }

  async openNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.style.display = 'flex';
      await this.loadUsers();
    }
  }

  closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
      modal.style.display = 'none';

      document.getElementById('selectUser').value = '';
      document.getElementById('selectProposal').value = '';
      document.getElementById('initialMessage').value = '';
    }
  }

  async loadUsers() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_users_list",
        }),
      });

      const data = await response.json();

      if (data.success) {
        const selectUser = document.getElementById('selectUser');
        selectUser.innerHTML = '<option value="">Selecione um usuário</option>';

        data.data.users.forEach(user => {
          const option = document.createElement('option');
          option.value = user.id;
          option.textContent = `${user.name} (${user.email})`;
          selectUser.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      this.showNotification("Erro ao carregar usuários", "error");
    }
  }

  async loadUserProposals(userId) {
    if (!userId) {
      const selectProposal = document.getElementById('selectProposal');
      selectProposal.innerHTML = '<option value="">Primeiro selecione um usuário</option>';
      return;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_user_proposals",
          user_id: userId
        }),
      });

      const data = await response.json();

      if (data.success) {
        const selectProposal = document.getElementById('selectProposal');
        selectProposal.innerHTML = '<option value="">Selecione uma proposta</option>';

        data.data.proposals.forEach(proposal => {
          const option = document.createElement('option');
          option.value = proposal.id;
          option.textContent = `#${proposal.id} - ${proposal.client_name}`;
          selectProposal.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar propostas do usuário:', error);
      this.showNotification("Erro ao carregar propostas", "error");
    }
  }

  async createNewChat() {
    const userId = document.getElementById('selectUser').value;
    const proposalId = document.getElementById('selectProposal').value;
    const initialMessage = document.getElementById('initialMessage').value.trim();

    if (!userId || !proposalId) {
      this.showNotification("Selecione um usuário e uma proposta", "error");
      return;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_new_chat",
          user_id: userId,
          proposal_id: proposalId,
          admin_id: this.user.id,
          initial_message: initialMessage
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.closeNewChatModal();
        this.showNotification("Nova conversa iniciada com sucesso!", "success");

        this.loadAdminChats();

        setTimeout(() => {
          this.openAdminChat(data.data.conversation_id, data.data.user_name || 'Usuário');
        }, 500);
      } else {
        this.showNotification(data.error || "Erro ao criar conversa", "error");
      }
    } catch (error) {
      console.error('Erro ao criar nova conversa:', error);
      this.showNotification("Erro ao criar conversa", "error");
    }
  }

  async loadAdminChats() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_admin_chats",
          user_id: this.user.id,
          user_type: this.user.user_type
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.updateAdminChatsList(data.data.chats || []);
        this.updateAdminChatNotificationBadge(data.data.chats || []);
      }
    } catch (error) {
      console.error('Erro ao carregar chats do admin:', error);
    }
  }

  updateAdminChatsList(chats) {
    const container = document.getElementById('adminChatsList');
    if (!container) return;

    if (chats.length === 0) {
      container.innerHTML = '<p class="no-data">Nenhuma conversa encontrada.</p>';
      return;
    }

    container.innerHTML = chats.map(chat => `
      <div class="chat-item" data-conversation-id="${chat.conversation_id}" data-user-name="${chat.user_name}">
        <div class="chat-info">
          <h4>Proposta #${chat.proposal_id}</h4>
          <p>Usuário: ${chat.user_name}</p>
          <p>Cliente: ${chat.client_name}</p>
          <p>Especialista: ${chat.specialist}</p>
          <small>Última atividade: ${new Date(chat.updated_at).toLocaleString('pt-BR')}</small>
        </div>
        ${chat.unread_count > 0 ? `<div class="chat-unread-badge">${chat.unread_count}</div>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', () => {
        const conversationId = item.getAttribute('data-conversation-id');
        const userName = item.getAttribute('data-user-name');
        this.openAdminChat(conversationId, userName);
      });
    });
  }

  updateAdminChatNotificationBadge(chats) {
    const badge = document.getElementById('adminChatNotificationBadge');
    if (!badge) return;

    const totalUnread = chats.reduce((sum, chat) => sum + parseInt(chat.unread_count || 0), 0);

    if (totalUnread > 0) {
      badge.textContent = totalUnread;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  async openAdminChat(conversationId, userName) {
    this.currentAdminConversationId = conversationId;

    const chatWindow = document.getElementById('adminChatWindow');
    const chatUserName = document.getElementById('adminChatUserName');

    if (chatWindow && chatUserName) {
      chatUserName.textContent = `Conversa com ${userName}`;
      chatWindow.style.display = 'flex';

      await this.loadAdminChatMessages(conversationId);
      this.startAdminChatPolling(conversationId);
    }
  }

  async loadAdminChatMessages(conversationId) {
    try {
      const response = await fetch(`${this.apiEndpoint}?action=get_messages&conversation_id=${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        const messages = data.data.messages || [];
        this.updateAdminChatMessages(messages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens do chat:', error);
    }
  }

  updateAdminChatMessages(messages) {
    const container = document.getElementById('adminChatMessages');
    if (!container) return;

    container.innerHTML = messages.map(message => `
      <div class="message ${message.sender_type === 'admin' ? 'message-admin' : 'message-user'}">
        <div class="message-content">
          <div class="message-text">${message.message}</div>
          <div class="message-info">
            <span class="message-sender">${message.sender_name}</span>
            <span class="message-time">${new Date(message.created_at).toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  startAdminChatPolling(conversationId) {
    if (this.adminChatPollingInterval) {
      clearInterval(this.adminChatPollingInterval);
    }

    this.adminChatPollingInterval = setInterval(() => {
      if (this.currentAdminConversationId === conversationId) {
        this.loadAdminChatMessages(conversationId);
      }
    }, 3000);
  }

  async sendAdminMessage() {
    const messageInput = document.getElementById('adminMessageInput');
    const message = messageInput.value.trim();

    if (!message || !this.currentAdminConversationId) {
      return;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_admin_message",
          conversation_id: this.currentAdminConversationId,
          admin_id: this.user.id,
          message: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        messageInput.value = '';
        await this.loadAdminChatMessages(this.currentAdminConversationId);
      } else {
        this.showNotification("Erro ao enviar mensagem: " + data.error, "error");
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      this.showNotification("Erro ao enviar mensagem", "error");
    }
  }

  async openChatForProposal(proposalId, clientName) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_chat_by_proposal",
          proposal_id: proposalId,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.conversation_id) {
        const chatMenuItem = document.querySelector('.nav-item[data-section="chats"]');
        if (chatMenuItem) {
          chatMenuItem.click();

          setTimeout(() => {
            this.openAdminChat(data.data.conversation_id, data.data.user_name || clientName);
          }, 500);
        }
      } else {
        this.showNotification("Nenhuma conversa encontrada para esta proposta", "info");
      }
    } catch (error) {
      console.error('Erro ao buscar chat da proposta:', error);
      this.showNotification("Erro ao buscar chat da proposta", "error");
    }
  }

  async startConversationWithUser(proposalId, clientName) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_proposal_details",
          proposal_id: proposalId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const proposal = data.data.proposal;

        const responseCreate = await fetch(this.apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create_new_chat",
            user_id: proposal.user_id,
            proposal_id: proposalId,
            admin_id: this.user.id,
            initial_message: "Olá! Gostaria de conversar sobre sua proposta."
          }),
        });

        const createData = await responseCreate.json();

        if (createData.success) {
          this.showNotification("Conversa iniciada com sucesso!", "success");
          this.openAdminChat(createData.data.conversation_id, clientName);
        } else {
          this.showNotification("Erro ao iniciar conversa: " + createData.error, "error");
        }
      }
    } catch (error) {
      console.error("Erro ao iniciar conversa:", error);
      this.showNotification("Erro ao iniciar conversa", "error");
    }
  }

  setupModals() {
    const proposalModal = document.getElementById("proposalModal");
    const observationModal = document.getElementById("observationModal");
    const newChatModal = document.getElementById("newChatModal");
    const bankModal = document.getElementById("bankSelectionModal");
    const reportModal = document.getElementById("reportModal");
    const closeObservationModal = document.getElementById("closeObservationModal");
    const cancelObservation = document.getElementById("cancelObservation");
    const confirmObservation = document.getElementById("confirmObservation");
    const reportBtn = document.getElementById("reportBtn");
    
    if (reportBtn) {
      reportBtn.addEventListener("click", () => this.openReportModal());
    }

    closeObservationModal?.addEventListener("click", () => {
      observationModal.style.display = "none";
    });

    cancelObservation?.addEventListener("click", () => {
      observationModal.style.display = "none";
      // Resetar banco selecionado ao cancelar
      this.pendingBankSelection = null;
      document.querySelectorAll('[data-bank]').forEach(option => {
        option.classList.remove('active');
      });
    });

    confirmObservation?.addEventListener("click", () => {
      this.confirmObservationAndChangeStatus();
    });

    [proposalModal, observationModal, newChatModal, bankModal].forEach((modal) => {
      modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });
    });
  }

  showNotification(message, type = "info") {
    let notification = document.getElementById("adminNotification");

    if (!notification) {
      notification = document.createElement("div");
      notification.id = "adminNotification";
      document.body.appendChild(notification);
    }

    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    setTimeout(() => notification.classList.add('show'), 100);

    setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
  }

  setupChartControls() {
    const chartYearFilter = document.getElementById('chartYearFilter');
    if (chartYearFilter) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i <= 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        chartYearFilter.appendChild(option);
      }

      chartYearFilter.addEventListener('change', (e) => {
        this.currentChartYear = e.target.value;
        this.updateChart();
      });
    }
  }

  showChart(proposals, title) {
    const chartContainer = document.getElementById('overviewChartContainer');
    const chartTitle = document.getElementById('chartTitle');

    if (chartContainer && chartTitle) {
      chartContainer.style.display = 'block';
      chartTitle.textContent = `Gráfico: ${title}`;
      this.renderChart(proposals);
    }
  }

  hideChart() {
    const chartContainer = document.getElementById('overviewChartContainer');
    if (chartContainer) {
      chartContainer.style.display = 'none';
    }
    if (this.currentChart) {
      this.currentChart.destroy();
      this.currentChart = null;
    }
  }

  updateChart() {
    let proposals = this.allProposals;

    if (this.currentCardFilter !== 'all' && this.currentCardFilter !== 'users') {
      proposals = proposals.filter(p => p.status === this.currentCardFilter);
    }

    this.renderChart(proposals);
  }

  renderChart(proposals) {
    const canvas = document.getElementById('proposalsChart');
    if (!canvas) return;

    if (this.currentChart) {
      this.currentChart.destroy();
    }

    const chartData = this.prepareChartData(proposals);

    const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkTheme ? '#f1f5f9' : '#1e293b';
    const gridColor = isDarkTheme ? '#334155' : '#e2e8f0';

    const ctx = canvas.getContext('2d');
    this.currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Quantidade de Propostas',
          data: chartData.data,
          backgroundColor: 'rgba(37, 99, 235, 0.7)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
          borderRadius: 6,
          barThickness: 40,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? '#1e293b' : '#ffffff',
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `Propostas: ${context.parsed.x}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              font: {
                size: 11
              },
              stepSize: 1
            },
            grid: {
              color: gridColor,
              drawBorder: false
            },
            title: {
              display: true,
              text: 'Quantidade de Propostas',
              color: textColor,
              font: {
                size: 13,
                weight: '600'
              }
            }
          },
          y: {
            ticks: {
              color: textColor,
              font: {
                size: 11
              }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            },
            title: {
              display: true,
              text: 'Período (Mês/Ano)',
              color: textColor,
              font: {
                size: 13,
                weight: '600'
              }
            }
          }
        }
      }
    });
  }

  prepareChartData(proposals) {
    const selectedYear = this.currentChartYear;

    let filteredProposals = proposals;
    if (selectedYear) {
      filteredProposals = proposals.filter(p => {
        const year = new Date(p.created_at).getFullYear();
        return year === parseInt(selectedYear);
      });
    }

    const monthYearMap = {};

    filteredProposals.forEach(proposal => {
      const date = new Date(proposal.created_at);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthYearMap[key]) {
        monthYearMap[key] = {
          count: 0,
          month: month,
          year: year
        };
      }
      monthYearMap[key].count++;
    });

    const sortedKeys = Object.keys(monthYearMap).sort();

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const labels = sortedKeys.map(key => {
      const data = monthYearMap[key];
      return `${monthNames[data.month]}/${data.year}`;
    });

    const data = sortedKeys.map(key => monthYearMap[key].count);

    return { labels, data };
  }


  
// Função corrigida para editar proposta
async editProposal(proposalId) {
  try {
    const response = await fetch(`${this.apiEndpoint}?action=get_proposal_details&proposal_id=${proposalId}`);
    const data = await response.json();

    if (data.success) {
      this.showEditProposalModal(data.data.proposal);
    } else {
      this.showNotification("Erro ao carregar dados da proposta.", "error");
    }
  } catch (error) {
    console.error("Erro ao buscar proposta para edição:", error);
    this.showNotification("Erro ao carregar dados da proposta.", "error");
  }
}

// Função corrigida para mostrar o modal de edição com todos os campos preservados
  showEditProposalModal(proposal) {
    const modal = document.getElementById("proposalModal");
    const modalContent = document.getElementById("proposalModalContent");
    
    // Chamar máscaras após o conteúdo ser inserido
    setTimeout(() => this.applyMasks(), 100);

  const birthDate = proposal.client_birth_date ? new Date(proposal.client_birth_date).toISOString().split('T')[0] : '';
  const openingDate = proposal.company_opening_date ? new Date(proposal.company_opening_date).toISOString().split('T')[0] : '';
  const dataProposta = proposal.data_proposta ? new Date(proposal.data_proposta).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  modalContent.innerHTML = `
    <div class="modal-header">
      <h2>Editar Proposta #${proposal.id}</h2>
      <button class="close-btn" onclick="adminDashboard.closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <form id="editProposalForm" class="proposal-edit-form">
        <input type="hidden" id="editProposalId" value="${proposal.id}">

        <div class="form-section">
          <h3>Informações do Cliente</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientName">Nome:</label>
              <input type="text" id="editClientName" value="${proposal.client_name || ''}" required maxlength="100">
            </div>
            <div class="form-group">
              <label for="editClientEmail">Email:</label>
              <input type="email" id="editClientEmail" value="${proposal.client_email || ''}" required maxlength="100">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientPhone">Telefone:</label>
              <input type="text" id="editClientPhone" value="${proposal.client_phone || ''}" required maxlength="15">
            </div>
            <div class="form-group">
              <label for="editClientDocument">Documento:</label>
              <input type="text" id="editClientDocument" value="${proposal.client_document || ''}" required maxlength="18">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientBirthDate">Data de Nascimento:</label>
              <input type="date" id="editClientBirthDate" value="${birthDate}">
            </div>
            <div class="form-group">
              <label for="editOpeningDate">Data de Abertura (PJ):</label>
              <input type="date" id="editOpeningDate" value="${openingDate}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientNaturalidade">Naturalidade:</label>
              <input type="text" id="editClientNaturalidade" value="${proposal.client_naturalidade || ''}" maxlength="50">
            </div>
            <div class="form-group">
              <label for="editClientRG">RG:</label>
              <input type="text" id="editClientRG" value="${proposal.client_rg || ''}" maxlength="20">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientMotherName">Nome da Mãe:</label>
              <input type="text" id="editClientMotherName" value="${proposal.client_mother_name || ''}" maxlength="100">
            </div>
            <div class="form-group">
              <label for="editClientFatherName">Nome do Pai:</label>
              <input type="text" id="editClientFatherName" value="${proposal.client_father_name || ''}" maxlength="100">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientProfession">Profissão:</label>
              <input type="text" id="editClientProfession" value="${proposal.client_profession || ''}" maxlength="50">
            </div>
            <div class="form-group">
              <label for="editClientType">Tipo de Cliente:</label>
              <select id="editClientType">
                <option value="pf" ${(proposal.client_type || '').toLowerCase() === 'pf' ? 'selected' : ''}>Pessoa Física</option>
                <option value="pj" ${(proposal.client_type || '').toLowerCase() === 'pj' ? 'selected' : ''}>Pessoa Jurídica</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editClientIncome">Renda (R$):</label>
              <input type="text" id="editClientIncome" value="${proposal.client_income || ''}" maxlength="20">
            </div>
            <div class="form-group">
              <label for="editClientCep">CEP:</label>
              <input type="text" id="editClientCep" value="${proposal.client_cep || ''}" maxlength="9">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label for="editClientAddress">Endereço:</label>
              <input type="text" id="editClientAddress" value="${proposal.client_address || ''}" maxlength="200">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label for="editObservation">Observações:</label>
              <textarea id="editObservation" rows="3" maxlength="500">${proposal.observation || ''}</textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editHasCnh">Possui CNH?:</label>
              <select id="editHasCnh">
                  <option value="Sim" ${(proposal.client_has_cnh || proposal.has_cnh || '').toLowerCase() === 'sim' ? 'selected' : ''}>Sim</option>
                  <option value="Não" ${(proposal.client_has_cnh || proposal.has_cnh || '').toLowerCase() === 'não' ? 'selected' : ''}>Não</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Informações do Veículo</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="editVehicleType">Tipo:</label>
              <select id="editVehicleType" required>
                  <option value="Leve" ${(proposal.vehicle_type || '').toLowerCase() === 'leve' ? 'selected' : ''}>Leve</option>
                  <option value="Médio (Vulk)" ${(proposal.vehicle_type || '').toLowerCase().includes('médio') || (proposal.vehicle_type || '').includes('M&eacute;dio') ? 'selected' : ''}>Médio (Vulk)</option>
                  <option value="Pesado" ${(proposal.vehicle_type || '').toLowerCase() === 'pesado' ? 'selected' : ''}>Pesado</option>
                  <option value="Moto" ${(proposal.vehicle_type || '').toLowerCase() === 'moto' ? 'selected' : ''}>Moto</option>
              </select>
            </div>
            <div class="form-group">
              <label for="editVehicleBrand">Marca:</label>
              <input type="text" id="editVehicleBrand" value="${proposal.vehicle_brand || ''}" required maxlength="50">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editVehicleModel">Modelo:</label>
              <input type="text" id="editVehicleModel" value="${proposal.vehicle_model || ''}" required maxlength="50">
            </div>
            <div class="form-group">
              <label for="editVehicleYear">Ano:</label>
              <input type="text" id="editVehicleYear" value="${proposal.vehicle_year || ''}" required maxlength="9">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editVehicleYearManufacture">Ano Fabricação:</label>
              <input type="text" id="editVehicleYearManufacture" value="${proposal.vehicle_year_manufacture || ''}" maxlength="4">
            </div>
            <div class="form-group">
              <label for="editVehicleYearModel">Ano Modelo:</label>
              <input type="text" id="editVehicleYearModel" value="${proposal.vehicle_year_model || ''}" maxlength="4">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editVehiclePlate">Placa:</label>
              <input type="text" id="editVehiclePlate" value="${proposal.vehicle_plate || ''}" maxlength="8">
            </div>
            <div class="form-group">
              <label for="editVehicleValue">Valor (R$):</label>
              <input type="number" step="0.01" id="editVehicleValue" value="${proposal.vehicle_value || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editVehicleCondition">Condição:</label>
              <select id="editVehicleCondition">
                  <option value="Novo" ${(proposal.vehicle_condition || '').toLowerCase() === 'novo' ? 'selected' : ''}>Novo</option>
                  <option value="Seminovo" ${(proposal.vehicle_condition || '').toLowerCase() === 'seminovo' ? 'selected' : ''}>Seminovo</option>
                  <option value="Usado" ${(proposal.vehicle_condition || '').toLowerCase() === 'usado' ? 'selected' : ''}>Usado</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Informações Financeiras</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="editFinanceValue">Valor de Financiamento (R$):</label>
              <input type="number" step="0.01" id="editFinanceValue" value="${proposal.finance_value || ''}" required>
            </div>
            <div class="form-group">
              <label for="editDownPayment">Entrada (R$):</label>
              <input type="number" step="0.01" id="editDownPayment" value="${proposal.down_payment || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editProductType">Tipo de Produto:</label>
              <select id="editProductType">
                  <option value="Financiamento" ${(proposal.product_type || '').toLowerCase() === 'financiamento' ? 'selected' : ''}>Financiamento</option>
                  <option value="Refinanciamento" ${(proposal.product_type || '').toLowerCase() === 'refinanciamento' ? 'selected' : ''}>Refinanciamento</option>
                  <option value="Leasing" ${(proposal.product_type || '').toLowerCase() === 'leasing' ? 'selected' : ''}>Leasing</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Informações Adicionais</h3>
          <div class="form-row">
            <div class="form-group">
              <label for="editSpecialist">Especialista:</label>
              <select id="editSpecialist">
                  <option value="">Selecione...</option>
                  ${this._getSpecialistOptions(proposal.specialist)}
              </select>
            </div>
            <div class="form-group">
              <label for="editIndicatedBy">Indicado por:</label>
              <input type="text" id="editIndicatedBy" value="${proposal.indicated_by || ''}" maxlength="100">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="editDataProposta">Data da Proposta:</label>
              <input type="date" id="editDataProposta" value="${dataProposta}">
            </div>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="adminDashboard.closeModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" onclick="adminDashboard.saveProposalEdit()">
        <i class="fas fa-save"></i> Salvar Alterações
      </button>
    </div>
  `;

  modal.style.display = "flex";
}

// Função corrigida para salvar edição de proposta com todos os campos
async saveProposalEdit() {
  const proposalId = document.getElementById('editProposalId').value;

  // Coletar todos os dados do formulário, preservando os valores existentes
  const proposalData = {
    proposal_id: proposalId,
    client_type: document.getElementById('editClientType').value,
    client_name: document.getElementById('editClientName').value,
    client_email: document.getElementById('editClientEmail').value,
    client_phone: document.getElementById('editClientPhone').value,
    client_document: document.getElementById('editClientDocument').value,
    client_birth_date: document.getElementById('editClientBirthDate').value,
    company_opening_date: document.getElementById('editOpeningDate').value,
    client_profession: document.getElementById('editClientProfession').value,
    client_income: document.getElementById('editClientIncome').value,
    client_cep: document.getElementById('editClientCep').value,
    client_address: document.getElementById('editClientAddress').value,
    client_has_cnh: document.getElementById('editHasCnh').value,
    vehicle_type: document.getElementById('editVehicleType').value,
    vehicle_brand: document.getElementById('editVehicleBrand').value,
    vehicle_model: document.getElementById('editVehicleModel').value,
    vehicle_year: document.getElementById('editVehicleYear').value,
    vehicle_year_manufacture: document.getElementById('editVehicleYearManufacture').value,
    vehicle_year_model: document.getElementById('editVehicleYearModel').value,
    vehicle_plate: document.getElementById('editVehiclePlate').value,
    vehicle_value: document.getElementById('editVehicleValue').value,
    vehicle_condition: document.getElementById('editVehicleCondition').value,
    finance_value: document.getElementById('editFinanceValue').value,
    down_payment: document.getElementById('editDownPayment').value,
    product_type: document.getElementById('editProductType').value,
    specialist: document.getElementById('editSpecialist').value,
    indicated_by: document.getElementById('editIndicatedBy').value,
    data_proposta: document.getElementById('editDataProposta').value,
    client_naturalidade: document.getElementById('editClientNaturalidade').value,
    client_rg: document.getElementById('editClientRG').value,
    client_mother_name: document.getElementById('editClientMotherName').value,
    client_father_name: document.getElementById('editClientFatherName').value,
    observation: document.getElementById('editObservation').value
  };

  try {
    const response = await fetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update_proposal_details",
        ...proposalData
      }),
    });

    // Verificar se a resposta HTTP foi bem-sucedida
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.warn("Resposta não é um JSON válido:", responseText);
      // Se a resposta HTTP foi OK (200), assumimos sucesso mesmo que o JSON falhe
      if (response.ok) {
        this.showNotification("Proposta atualizada com sucesso!", "success");
        this.loadDashboardData();
        setTimeout(() => this.showProposalDetails(proposalId), 800);
        return;
      }
      throw new Error("Resposta inválida do servidor");
    }

    // Verificar se a resposta JSON é válida e tem a propriedade success
    if (data && data.success === true) {
      this.showNotification("Proposta atualizada com sucesso!", "success");
      this.loadDashboardData();
      setTimeout(() => this.showProposalDetails(proposalId), 800);
    } else if (data && data.success === false) {
      this.showNotification(data.error || "Erro ao atualizar proposta.", "error");
    } else {
      // Se chegou aqui e o status HTTP é 200, provavelmente deu certo
      this.showNotification("Proposta atualizada com sucesso!", "success");
      this.loadDashboardData();
      setTimeout(() => this.showProposalDetails(proposalId), 800);
    }
  } catch (error) {
    console.error("Erro ao salvar edição:", error);
    this.showNotification("Erro ao salvar alterações.", "error");
  }
}

  // ============ FUNÇÕES PARA GESTÃO FINANCEIRA ============

  // Carregar estatísticas financeiras
  async loadFinanceiroStats() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_bills_stats" })
      });
      const data = await response.json();
      
      if (data.success) {
        document.getElementById('contasPagasCount').textContent = data.data.contas_pagas || 0;
        document.getElementById('contasAPagarCount').textContent = data.data.contas_a_pagar || 0;
        document.getElementById('gastoMensalValue').textContent = 
          'R$ ' + (data.data.gasto_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas financeiras:', error);
    }
  }

  // Carregar lista de contas
  async loadBills() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_bills" })
      });
      const data = await response.json();
      
      if (data.success) {
        this.allBills = data.data.bills || []; // Armazenar todas as contas
        this.filterAndRenderBills(); // Renderizar com filtros aplicados
        this.renderFinanceiroMonthlyChart(); // Renderizar gráfico de pizza
      } else {
        console.error('Erro ao carregar contas:', data.error);
        this.showNotification(data.error || 'Erro ao carregar contas', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      // Não mostrar notificação de erro se os dados foram carregados
      if (this.allBills.length === 0) {
        this.showNotification('Erro ao carregar contas', 'error');
      }
    }
  }

  // NOVA FUNÇÃO: Renderizar gráfico de pizza com gastos por mês
  renderFinanceiroMonthlyChart() {
    const canvas = document.getElementById('financeiroMonthlyChart');
    if (!canvas) return;

    // Agrupar contas por mês
    const monthlyData = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    this.allBills.forEach(bill => {
      const date = new Date(bill.created_at);
      const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += parseFloat(bill.valor);
    });

    // Preparar dados para o gráfico
    const labels = Object.keys(monthlyData);
    const values = Object.values(monthlyData);
    
    // Cores para o gráfico
    const colors = [
      '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0ea5e9',
      '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#84cc16'
    ];

    // Destruir gráfico anterior se existir
    if (this.financeiroChart) {
      this.financeiroChart.destroy();
    }

    // Criar novo gráfico
    const ctx = canvas.getContext('2d');
    this.financeiroChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
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
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // Renderizar lista de contas
  renderBills(bills) {
    const container = document.getElementById('billsGridContainer');
    
    if (!bills || bills.length === 0) {
      container.innerHTML = '<p class="no-data">Nenhuma conta cadastrada ainda</p>';
      return;
    }

    const categoryIcons = {
      'Marketing': '📢',
      'Alimentação': '🍽️',
      'Limpeza': '🧹',
      'Viagens': '✈️',
      'Aluguel': '🏠',
      'Conta de Luz': '💡',
      'Conta de Água': '💧',
      'Equipamentos': '🔧',
      'Tecnologia': '🖥️',
      'Móveis': '🪑',
      'Funcionários': '👥'
    };

    container.innerHTML = bills.map(bill => {
      // Formatar data de criação
      const createdAt = new Date(bill.created_at);
      const formattedCreated = createdAt.toLocaleDateString('pt-BR');
      
      // Lógica de vencimento solicitada
      let dueDateText = '';
      if (bill.frequencia === 'única') {
        // Para dia único, calculamos a data baseada no dia escolhido
        // Se o dia já passou no mês de criação, vai para o próximo mês
        let due = new Date(createdAt.getFullYear(), createdAt.getMonth(), parseInt(bill.dia_pagamento));
        if (due < createdAt) {
          due.setMonth(due.getMonth() + 1);
        }
        dueDateText = `Vence em: ${due.toLocaleDateString('pt-BR')}`;
      } else {
        // Para mensal
        dueDateText = `Conta a ser paga todo dia ${bill.dia_pagamento} do mês`;
      }

      return `
        <div class="bill-card ${bill.pago ? 'bill-paid' : 'bill-unpaid'}" onclick="adminDashboard.showBillDetail(${bill.id})">
          <div class="bill-card-header">
            <span class="bill-icon">${categoryIcons[bill.categoria] || '📋'}</span>
            <span class="bill-status-badge ${bill.pago ? 'status-paid' : 'status-unpaid'}">
              ${bill.pago ? 'Pago' : 'Pendente'}
            </span>
          </div>
          <h4 class="bill-name">${bill.nome_conta}</h4>
          <p class="bill-category">${bill.categoria}</p>
          <div class="bill-info">
            <div class="bill-value">R$ ${parseFloat(bill.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="bill-meta" style="flex-direction: column; align-items: flex-start; gap: 4px;">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Criada em: ${formattedCreated}</span>
              <span style="font-weight: 600; color: ${bill.pago ? 'var(--success-color)' : '#e11d48'}; font-size: 0.8rem;">
                ${dueDateText}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Abrir modal de criar conta
  openCreateBillModal() {
    document.getElementById('billModalTitle').textContent = 'Criar Nova Conta';
    document.getElementById('billId').value = '';
    document.getElementById('billForm').reset();
    document.getElementById('billModal').style.display = 'flex';
  }
  // NOVA FUNÇÃO: Criar conta para o período selecionado
  createBillForSelectedPeriod() {
    // Abrir o modal de criar conta
    this.openCreateBillModal();
    
    // Se houver mês e ano selecionados, preencher o título do modal
    if (this.filteredMonth && this.filteredYear) {
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[parseInt(this.filteredMonth) - 1];
      
      document.getElementById('billModalTitle').textContent = 
        `Criar Conta - ${monthName}/${this.filteredYear}`;
      
      // Mostrar notificação informativa
      this.showNotification(
        `Criando conta para ${monthName}/${this.filteredYear}`, 
        'info'
      );
    }
  }

  // Fechar modal de criar/editar
  closeBillModal() {
    document.getElementById('billModal').style.display = 'none';
  }

  // Salvar conta (criar ou atualizar)
  async saveBill() {
    const billId = document.getElementById('billId').value;
    const nomeConta = document.getElementById('nomeConta').value.trim();
    const valor = parseFloat(document.getElementById('valorConta').value);
    const diaPagamento = parseInt(document.getElementById('diaPagamento').value);
    const frequencia = document.getElementById('frequenciaConta').value;
    const categoria = document.getElementById('categoriaConta').value;
    const observacao = document.getElementById('observacaoConta').value.trim();

    // Validações
    if (!nomeConta || !valor || !diaPagamento || !frequencia || !categoria) {
      this.showNotification('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    if (valor <= 0) {
      this.showNotification('Valor deve ser maior que zero', 'error');
      return;
    }

    if (diaPagamento < 1 || diaPagamento > 31) {
      this.showNotification('Dia de pagamento inválido (1-31)', 'error');
      return;
    }

    const billData = {
      nome_conta: nomeConta,
      valor: valor,
      dia_pagamento: diaPagamento,
      frequencia: frequencia,
      categoria: categoria,
      observacao: observacao
    };

    try {
      const action = billId ? 'update_bill' : 'create_bill';
      if (billId) {
        billData.id = parseInt(billId);
      }

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, ...billData })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification(billId ? 'Conta atualizada!' : 'Conta criada!', 'success');
        this.closeBillModal();
        this.loadBills();
        this.loadFinanceiroStats();
      } else {
        this.showNotification(data.error || 'Erro ao salvar conta', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      this.showNotification('Erro ao salvar conta', 'error');
    }
  }

  // Mostrar detalhes da conta
  async showBillDetail(billId) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_bill", id: billId })
      });

      const data = await response.json();

      if (data.success) {
        const bill = data.data.bill;
        
        const categoryIcons = {
          'Marketing': '📢',
          'Alimentação': '🍽️',
          'Limpeza': '🧹',
          'Viagens': '✈️',
          'Aluguel': '🏠',
          'Conta de Luz': '💡',
          'Conta de Água': '💧',
          'Equipamentos': '🔧',
          'Tecnologia': '🖥️',
          'Móveis': '🪑',
          'Funcionários': '👥'
        };

        document.getElementById('billDetailTitle').innerHTML = 
          `${categoryIcons[bill.categoria] || '📋'} ${bill.nome_conta}`;

        // Formatar data de criação
        const createdAt = new Date(bill.created_at);
        const formattedCreated = createdAt.toLocaleDateString('pt-BR');
        
        // Lógica de vencimento solicitada
        let dueDateText = '';
        if (bill.frequencia === 'única') {
          let due = new Date(createdAt.getFullYear(), createdAt.getMonth(), parseInt(bill.dia_pagamento));
          if (due < createdAt) {
            due.setMonth(due.getMonth() + 1);
          }
          dueDateText = due.toLocaleDateString('pt-BR');
        } else {
          dueDateText = `Conta a ser paga todo dia ${bill.dia_pagamento} do mês`;
        }

        document.getElementById('billDetailContent').innerHTML = `
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label">Valor:</span>
              <span class="detail-value">R$ ${parseFloat(bill.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Data de Criação:</span>
              <span class="detail-value">${formattedCreated}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vencimento/Recorrência:</span>
              <span class="detail-value" style="font-weight: 700; color: ${bill.pago ? 'var(--success-color)' : '#e11d48'};">
                ${dueDateText}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Frequência:</span>
              <span class="detail-value">${bill.frequencia}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Categoria:</span>
              <span class="detail-value">${bill.categoria}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="bill-status-badge ${bill.pago ? 'status-paid' : 'status-unpaid'}">
                ${bill.pago ? 'Pago' : 'Pendente'}
              </span>
            </div>
            ${bill.observacao ? `
            <div class="detail-row full">
              <span class="detail-label">Observação:</span>
              <p class="detail-observation">${bill.observacao}</p>
            </div>
            ` : ''}
          </div>
        `;

        document.getElementById('billDetailActions').innerHTML = `
          <button class="btn btn-danger" onclick="adminDashboard.deleteBill(${bill.id})">
            <i class="fas fa-trash"></i> Deletar
          </button>
          <button class="btn ${bill.pago ? 'btn-warning' : 'btn-success'}" onclick="adminDashboard.toggleBillStatus(${bill.id}, ${bill.pago})">
            <i class="fas fa-${bill.pago ? 'times' : 'check'}"></i> 
            ${bill.pago ? 'Marcar como Pendente' : 'Marcar como Pago'}
          </button>
        `;

        document.getElementById('billDetailModal').style.display = 'flex';
      } else {
        this.showNotification('Erro ao carregar detalhes', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      this.showNotification('Erro ao carregar detalhes', 'error');
    }
  }

  // Fechar modal de detalhes
  closeBillDetailModal() {
    document.getElementById('billDetailModal').style.display = 'none';
  }

  // Alternar status pago/pendente
  async toggleBillStatus(billId, currentStatus) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bill",
          id: billId,
          pago: !currentStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Status atualizado!', 'success');
        this.closeBillDetailModal();
        this.loadBills();
        this.loadFinanceiroStats();
      } else {
        this.showNotification(data.error || 'Erro ao atualizar status', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      this.showNotification('Erro ao atualizar status', 'error');
    }
  }

  // Deletar conta
  async deleteBill(billId) {
    if (!confirm('Tem certeza que deseja deletar esta conta?')) {
      return;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_bill",
          id: billId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Conta deletada!', 'success');
        this.closeBillDetailModal();
        this.loadBills();
        this.loadFinanceiroStats();
      } else {
        this.showNotification(data.error || 'Erro ao deletar conta', 'error');
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      this.showNotification('Erro ao deletar conta', 'error');
    }
  }

  // ============ NOVAS FUNÇÕES: FILTROS DE PERÍODO E VISUALIZAÇÃO POR CATEGORIA ============

  // Configurar filtros de período
  setupPeriodFilters() {
    const filterMonth = document.getElementById('filterMonth');
    const filterYear = document.getElementById('filterYear');
    const clearPeriodFilters = document.getElementById('clearPeriodFilters');

    // Popular anos (atual + 5 anos futuros)
    if (filterYear) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i <= 5; i++) {
        const year = currentYear + i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        filterYear.appendChild(option);
      }
    }

    // Event listeners
    if (filterMonth) {
      filterMonth.addEventListener('change', () => this.applyPeriodFilter());
    }
    if (filterYear) {
      filterYear.addEventListener('change', () => this.applyPeriodFilter());
    }
    if (clearPeriodFilters) {
      clearPeriodFilters.addEventListener('click', () => this.clearPeriodFilters());
    }

    // CORREÇÃO: Adicionar event listeners para os cards de contas pagas/a pagar
    const contasPagasCard = document.querySelector('[data-bill-filter="pago"]');
    const contasAPagarCard = document.querySelector('[data-bill-filter="pendente"]');
    const gastoMensalCard = document.querySelector('[data-bill-filter="all"]');

    if (contasPagasCard) {
      contasPagasCard.addEventListener('click', () => this.filterBillsByStatus('pago'));
    }
    if (contasAPagarCard) {
      contasAPagarCard.addEventListener('click', () => this.filterBillsByStatus('pendente'));
    }
    if (gastoMensalCard) {
      gastoMensalCard.addEventListener('click', () => this.filterBillsByStatus('all'));
    }
  }

  // NOVA FUNÇÃO: Filtrar contas por status (pago/pendente/all)
  filterBillsByStatus(status) {
    this.filteredBillStatus = status;
    
    // Atualizar visual dos cards
    document.querySelectorAll('[data-bill-filter]').forEach(card => {
      card.classList.remove('card-active');
    });
    
    const activeCard = document.querySelector(`[data-bill-filter="${status}"]`);
    if (activeCard) {
      activeCard.classList.add('card-active');
    }
    
    // Aplicar filtro e renderizar
    this.filterAndRenderBills();
    
    // Notificar usuário
    const count = this.getCurrentFilteredBillsCount();
    let message = '';
    if (status === 'pago') {
      message = `Exibindo ${count} conta(s) paga(s)`;
    } else if (status === 'pendente') {
      message = `Exibindo ${count} conta(s) a serem pagas`;
    } else {
      message = `Exibindo todas as ${count} conta(s)`;
    }
    this.showNotification(message, 'info');
  }

  // Função auxiliar para contar contas filtradas
  getCurrentFilteredBillsCount() {
    let filtered = this.allBills;
    
    // Aplicar filtro de status
    if (this.filteredBillStatus !== 'all') {
      const isPago = this.filteredBillStatus === 'pago';
      filtered = filtered.filter(bill => bill.pago === isPago);
    }
    
    // Aplicar filtro de mês/ano
    if (this.filteredMonth || this.filteredYear) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.created_at);
        const billMonth = String(billDate.getMonth() + 1).padStart(2, '0');
        const billYear = String(billDate.getFullYear());

        const monthMatch = !this.filteredMonth || billMonth === this.filteredMonth;
        const yearMatch = !this.filteredYear || billYear === this.filteredYear;

        return monthMatch && yearMatch;
      });
    }
    
    return filtered.length;
  }

  // Aplicar filtro de período
  applyPeriodFilter() {
    this.filteredMonth = document.getElementById('filterMonth').value;
    this.filteredYear = document.getElementById('filterYear').value;

    // Atualizar UI
    const selectedPeriodInfo = document.getElementById('selectedPeriodInfo');
    const selectedPeriodText = document.getElementById('selectedPeriodText');
    const createBillForPeriod = document.getElementById('createBillForPeriod');
    
    if (this.filteredMonth || this.filteredYear) {
      let periodText = 'Exibindo contas ';
      if (this.filteredMonth && this.filteredYear) {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        periodText += `de ${monthNames[parseInt(this.filteredMonth) - 1]} de ${this.filteredYear}`;
        if (createBillForPeriod) createBillForPeriod.style.display = 'inline-block';
      } else if (this.filteredMonth) {
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        periodText += `do mês de ${monthNames[parseInt(this.filteredMonth) - 1]}`;
        if (createBillForPeriod) createBillForPeriod.style.display = 'none';
      } else {
        periodText += `do ano de ${this.filteredYear}`;
        if (createBillForPeriod) createBillForPeriod.style.display = 'none';
      }
      
      if (selectedPeriodInfo && selectedPeriodText) {
        selectedPeriodText.textContent = periodText;
        selectedPeriodInfo.style.display = 'block';
      }
    } else {
      if (selectedPeriodInfo) selectedPeriodInfo.style.display = 'none';
      if (createBillForPeriod) createBillForPeriod.style.display = 'none';
    }

    // Recarregar contas com filtro
    this.filterAndRenderBills();
  }

  // Limpar filtros de período
  clearPeriodFilters() {
    this.filteredMonth = '';
    this.filteredYear = '';
    this.filteredBillStatus = 'all'; // CORREÇÃO: Resetar filtro de status também
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterYear').value = '';
    document.getElementById('selectedPeriodInfo').style.display = 'none';
    document.getElementById('createBillForPeriod').style.display = 'none';
    
    // Remover visual dos cards ativos
    document.querySelectorAll('[data-bill-filter]').forEach(card => {
      card.classList.remove('card-active');
    });
    
    this.filterAndRenderBills();
  }

  // Filtrar e renderizar contas
  filterAndRenderBills() {
    let filtered = this.allBills;

    // CORREÇÃO: Aplicar filtro de status primeiro
    if (this.filteredBillStatus !== 'all') {
      const isPago = this.filteredBillStatus === 'pago';
      filtered = filtered.filter(bill => bill.pago === isPago);
    }

    // Aplicar filtro de mês/ano
    if (this.filteredMonth || this.filteredYear) {
      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.created_at);
        const billMonth = String(billDate.getMonth() + 1).padStart(2, '0');
        const billYear = String(billDate.getFullYear());

        const monthMatch = !this.filteredMonth || billMonth === this.filteredMonth;
        const yearMatch = !this.filteredYear || billYear === this.filteredYear;

        return monthMatch && yearMatch;
      });
    }

    // Renderizar conforme modo de visualização
    if (this.viewMode === 'category') {
      this.renderBillsByCategory(filtered);
    } else {
      this.renderBills(filtered);
    }

    // Atualizar título
    const billsListTitle = document.getElementById('billsListTitle');
    if (billsListTitle) {
      let titleText = '';
      if (this.filteredBillStatus === 'pago') {
        titleText = `Contas Pagas (${filtered.length})`;
      } else if (this.filteredBillStatus === 'pendente') {
        titleText = `Contas a Pagar (${filtered.length})`;
      } else if (this.filteredMonth || this.filteredYear) {
        titleText = `Contas Filtradas (${filtered.length})`;
      } else {
        titleText = `Todas as Contas (${filtered.length})`;
      }
      billsListTitle.textContent = titleText;
    }
  }

  // Renderizar contas por categoria
  renderBillsByCategory(bills) {
    const container = document.getElementById('billsByCategoryContainer');
    const gridContainer = document.getElementById('billsGridContainer');
    
    container.style.display = 'block';
    gridContainer.style.display = 'none';

    if (!bills || bills.length === 0) {
      container.innerHTML = '<p class="no-data">Nenhuma conta encontrada para este período</p>';
      return;
    }

    // Agrupar por categoria
    const categories = {
      'Marketing': { icon: '📢', bills: [], color: '#f59e0b' },
      'Alimentação': { icon: '🍽️', bills: [], color: '#10b981' },
      'Limpeza': { icon: '🧹', bills: [], color: '#06b6d4' },
      'Viagens': { icon: '✈️', bills: [], color: '#8b5cf6' },
      'Aluguel': { icon: '🏠', bills: [], color: '#ec4899' },
      'Conta de Luz': { icon: '💡', bills: [], color: '#f59e0b' },
      'Conta de Água': { icon: '💧', bills: [], color: '#3b82f6' },
      'Equipamentos': { icon: '🔧', bills: [], color: '#6b7280' },
      'Tecnologia': { icon: '🖥️', bills: [], color: '#2563eb' },
      'Móveis': { icon: '🪑', bills: [], color: '#92400e' },
      'Funcionários': { icon: '👥', bills: [], color: '#16a34a' }
    };

    bills.forEach(bill => {
      if (categories[bill.categoria]) {
        categories[bill.categoria].bills.push(bill);
      }
    });

    let html = '';
    for (const [catName, catData] of Object.entries(categories)) {
      if (catData.bills.length === 0) continue;

      const total = catData.bills.reduce((sum, bill) => sum + parseFloat(bill.valor), 0);
      const pagas = catData.bills.filter(b => b.pago).length;
      const pendentes = catData.bills.length - pagas;

      html += `
        <div class="category-section" style="margin-bottom: 2rem; background: var(--card-background); border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div class="category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 2px solid ${catData.color};">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 2rem;">${catData.icon}</span>
              <div>
                <h4 style="color: var(--text-color); font-size: 1.25rem; font-weight: 700; margin: 0;">${catName}</h4>
                <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0 0 0;">
                  ${catData.bills.length} conta(s) • ${pagas} paga(s) • ${pendentes} pendente(s)
                </p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="color: var(--text-secondary); font-size: 0.75rem; margin: 0;">Total da Categoria</p>
              <p style="color: ${catData.color}; font-size: 1.5rem; font-weight: 700; margin: 0.25rem 0 0 0;">
                R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div class="bills-grid">
            ${catData.bills.map(bill => `
              <div class="bill-card ${bill.pago ? 'bill-paid' : 'bill-unpaid'}" onclick="adminDashboard.showBillDetail(${bill.id})">
                <div class="bill-card-header">
                  <span class="bill-icon">${catData.icon}</span>
                  <span class="bill-status-badge ${bill.pago ? 'status-paid' : 'status-unpaid'}">
                    ${bill.pago ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <h4 class="bill-name">${bill.nome_conta}</h4>
                <p class="bill-category">${bill.categoria}</p>
                <div class="bill-info">
                  <div class="bill-value">R$ ${parseFloat(bill.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div class="bill-meta">
                    <span>Dia ${bill.dia_pagamento}</span>
                    <span>${bill.frequencia}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  // Alternar modo de visualização
  toggleViewMode(mode) {
    this.viewMode = mode;
    
    const viewByCategory = document.getElementById('viewByCategory');
    const viewByList = document.getElementById('viewByList');
    
    if (mode === 'category') {
      if (viewByCategory) viewByCategory.classList.add('active');
      if (viewByList) viewByList.classList.remove('active');
    } else {
      if (viewByList) viewByList.classList.add('active');
      if (viewByCategory) viewByCategory.classList.remove('active');
    }
    
    this.filterAndRenderBills();
  }

  // Criar conta para período selecionado
  createBillForSelectedPeriod() {
    if (!this.filteredMonth || !this.filteredYear) {
      this.showNotification('Selecione mês e ano primeiro', 'error');
      return;
    }

    // Abrir modal e preencher informações
    this.openCreateBillModal();
    
    // Adicionar indicação visual do período selecionado
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const periodText = `${monthNames[parseInt(this.filteredMonth) - 1]}/${this.filteredYear}`;
    
    document.getElementById('billModalTitle').innerHTML = 
      `Criar Nova Conta para ${periodText} <span style="font-size: 0.875rem; color: #2563eb; font-weight: normal;">(${periodText})</span>`;
  }

  // Função loadBills duplicada removida - usando apenas a definição anterior que inclui o gráfico

  // ============ FUNÇÕES PARA GESTÃO DE PLANILHAS ============

setupSpreadsheetsModule() {
  // Event listener para o botão de upload
  const btnUpload = document.getElementById('btnUploadSpreadsheet');
  const fileInput = document.getElementById('spreadsheetFileInput');
  
  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', async () => {
        if (window.__TAURI__) {
          const file = await tauriOpenFile([{ name: 'Planilhas', extensions: ['xlsx', 'xls'] }]);
          if (file) this.handleSpreadsheetUpload(file);
        } else {
          fileInput.click();
        }
      });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleSpreadsheetUpload(e.target.files[0]);
      }
    });
  }
  
  // Carregar planilhas quando a aba for ativada
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-tab') === 'planilhas') {
        this.loadSpreadsheets();
      }
    });
  });
}

// Fazer upload de planilha
async handleSpreadsheetUpload(file) {
  // Validar extensão
  const validExtensions = ['xlsx', 'xls'];
  const fileName = file.name;
  const extension = fileName.split('.').pop().toLowerCase();
  
  if (!validExtensions.includes(extension)) {
    this.showNotification('Apenas arquivos Excel (.xlsx, .xls) são permitidos', 'error');
    return;
  }
  
  // Verificar se já existe planilha com mesmo nome
  const baseName = fileName.substring(0, fileName.lastIndexOf('.'));
  
  try {
    // Criar FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'upload_spreadsheet');
    
    // Mostrar loading
    this.showNotification('Processando planilha...', 'info');
    
    // Fazer upload
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Verificar se precisa sobrescrever
      if (data.data && data.data.exists) {
        if (confirm(data.data.message)) {
          // Fazer novo upload com flag de sobrescrever
          const formDataOverwrite = new FormData();
          formDataOverwrite.append('file', file);
          formDataOverwrite.append('action', 'upload_spreadsheet');
          formDataOverwrite.append('overwrite', 'true');
          
          const responseOverwrite = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: formDataOverwrite
          });
          
          const dataOverwrite = await responseOverwrite.json();
          
          if (dataOverwrite.success) {
            this.showNotification('Planilha sobrescrita com sucesso!', 'success');
            this.loadSpreadsheets();
          } else {
            this.showNotification(dataOverwrite.error || 'Erro ao sobrescrever planilha', 'error');
          }
        }
      } else {
        this.showNotification('Planilha importada com sucesso!', 'success');
        this.loadSpreadsheets();
      }
    } else {
      this.showNotification(data.error || 'Erro ao fazer upload', 'error');
    }
    
    // Limpar input
    document.getElementById('spreadsheetFileInput').value = '';
    
  } catch (error) {
    console.error('Erro no upload:', error);
    this.showNotification('Erro ao processar planilha', 'error');
  }
}

// Carregar lista de planilhas
async loadSpreadsheets() {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list_spreadsheets' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.renderSpreadsheets(data.data.spreadsheets || []);
      
      // Atualizar contador
      const count = data.data.spreadsheets ? data.data.spreadsheets.length : 0;
      const countElement = document.getElementById('totalSpreadsheetsCount');
      if (countElement) {
        countElement.textContent = count;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar planilhas:', error);
    this.showNotification('Erro ao carregar planilhas', 'error');
  }
}

// Renderizar planilhas
renderSpreadsheets(spreadsheets) {
  const container = document.getElementById('spreadsheetsContainer');
  
  if (!container) return;
  
  if (!spreadsheets || spreadsheets.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-table"></i>
        <h3>Nenhuma Planilha Salva</h3>
        <p>Importe sua primeira planilha para começar</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="spreadsheets-grid">
      ${spreadsheets.map(sheet => `
        <div class="spreadsheet-card" data-testid="spreadsheet-${sheet.id}">
          <div class="spreadsheet-card-header">
            <div class="spreadsheet-icon">
              <i class="fas fa-file-excel"></i>
            </div>
            <div class="spreadsheet-info">
              <h4 class="spreadsheet-name">${sheet.nome}</h4>
              <p class="spreadsheet-meta">
                ${sheet.num_colunas} coluna(s) • ${sheet.num_linhas} linha(s)
              </p>
            </div>
          </div>
          <div class="spreadsheet-card-body">
            <p class="spreadsheet-date">
              <i class="fas fa-calendar"></i>
              Atualizado em ${new Date(sheet.updated_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div class="spreadsheet-card-actions">
            <button class="btn btn-sm btn-primary" onclick="adminDashboard.downloadSpreadsheet(${sheet.id})" title="Baixar">
              <i class="fas fa-download"></i> Baixar
            </button>
            <button class="btn btn-sm btn-secondary" onclick="adminDashboard.renameSpreadsheet(${sheet.id}, '${sheet.nome}')" title="Renomear">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteSpreadsheet(${sheet.id}, '${sheet.nome}')" title="Deletar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Baixar planilha
async downloadSpreadsheet(id) {
  try {
    // Criar URL para download
    const url = `${this.apiEndpoint}?action=download_spreadsheet&id=${id}`;
    if (window.__TAURI__) {
      await this.tauriDownloadFile(url, `planilha_${id}.xlsx`, [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]);
    } else {
      window.open(url, '_blank');
      this.showNotification('Download iniciado!', 'success');
    }
  } catch (error) {
    console.error('Erro ao baixar planilha:', error);
    this.showNotification('Erro ao baixar planilha', 'error');
  }
}

// Renomear planilha
async renameSpreadsheet(id, currentName) {
  const newName = prompt('Digite o novo nome para a planilha:', currentName);
  
  if (!newName || newName.trim() === '') {
    return;
  }
  
  if (newName === currentName) {
    this.showNotification('O nome não foi alterado', 'info');
    return;
  }
  
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rename_spreadsheet',
        id: id,
        novo_nome: newName.trim()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showNotification('Planilha renomeada com sucesso!', 'success');
      this.loadSpreadsheets();
    } else {
      this.showNotification(data.error || 'Erro ao renomear planilha', 'error');
    }
  } catch (error) {
    console.error('Erro ao renomear planilha:', error);
    this.showNotification('Erro ao renomear planilha', 'error');
  }
}

// Deletar planilha
async deleteSpreadsheet(id, name) {
  if (!confirm(`Tem certeza que deseja deletar a planilha "${name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_spreadsheet',
        id: id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showNotification('Planilha deletada com sucesso!', 'success');
      this.loadSpreadsheets();
    } else {
      this.showNotification(data.error || 'Erro ao deletar planilha', 'error');
    }
  } catch (error) {
    console.error('Erro ao deletar planilha:', error);
    this.showNotification('Erro ao deletar planilha', 'error');
  }
}

// ============ FIM DAS FUNÇÕES DE PLANILHAS ============

// ============ FIM DAS FUNÇÕES FINANCEIRAS ============

// ============ FUNÇÕES PARA GESTÃO DE DOCUMENTOS ============

// Configurar módulo de documentos
setupDocumentsModule() {
  const searchClientDocuments = document.getElementById('searchClientDocuments');
  
  if (searchClientDocuments) {
    searchClientDocuments.addEventListener('input', (e) => {
      this.filterClientDocuments(e.target.value);
    });
  }
  
  // Carregar documentos quando a aba for ativada (Visão Geral)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-tab') === 'documentos') {
        this.loadClientDocuments();
      }
    });
  });
}

// Carregar lista de clientes com documentos
async loadClientDocuments() {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_client_documents' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.allClientDocuments = data.data.clients || [];
      this.filteredClientDocuments = [...this.allClientDocuments];
      
      // Atualizar estatísticas
      document.getElementById('totalDocumentsCount').textContent = data.data.total_documents || 0;
      document.getElementById('totalClientsWithDocsCount').textContent = data.data.total_clients || 0;
      
      this.renderClientDocuments(this.filteredClientDocuments);
    }
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    this.showNotification('Erro ao carregar documentos', 'error');
  }
}

// Renderizar lista de clientes com documentos
renderClientDocuments(clients) {
  const container = document.getElementById('clientDocumentsContainer');
  
  if (!container) return;
  
  if (!clients || clients.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-folder-open"></i>
        <h3>Nenhum Documento Encontrado</h3>
        <p>Não há documentos cadastrados no sistema ainda</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="documents-grid">
      ${clients.map(client => `
        <div class="client-document-card" onclick="adminDashboard.showClientDocumentDetails('${client.client_name}')">
          <div class="client-document-card-header">
            <div class="client-document-icon">
              <i class="fas fa-user"></i>
            </div>
            <div class="client-document-info">
              <h4 class="client-document-name">${client.client_name}</h4>
              <p class="client-document-meta">
                <i class="fas fa-file-alt"></i> ${client.document_count} documento(s)
              </p>
            </div>
          </div>
          <div class="client-document-card-body">
            <p class="client-document-date">
              <i class="fas fa-calendar"></i>
              Último upload: ${new Date(client.last_upload).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div class="client-document-card-footer">
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); adminDashboard.showClientDocumentDetails('${client.client_name}')">
              <i class="fas fa-eye"></i> Ver Documentos
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Filtrar clientes por nome
filterClientDocuments(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    this.filteredClientDocuments = [...this.allClientDocuments];
  } else {
    const term = searchTerm.toLowerCase();
    this.filteredClientDocuments = this.allClientDocuments.filter(client =>
      client.client_name.toLowerCase().includes(term)
    );
  }
  
  this.renderClientDocuments(this.filteredClientDocuments);
}

// Mostrar detalhes dos documentos de um cliente
async showClientDocumentDetails(clientName) {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_client_document_details',
        client_name: clientName
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const documents = data.data.documents || [];
      
      const modal = document.getElementById('clientDocumentsModal');
      const modalTitle = document.getElementById('clientDocumentsModalTitle');
      const modalContent = document.getElementById('clientDocumentsModalContent');
      
      modalTitle.textContent = `Documentos de ${clientName}`;
      
      if (documents.length === 0) {
        modalContent.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <h3>Nenhum Documento</h3>
            <p>Este cliente ainda não possui documentos enviados</p>
          </div>
        `;
      } else {
        modalContent.innerHTML = `
          <div class="documents-list">
            <h3 style="margin-bottom: 1rem;">Total: ${documents.length} documento(s)</h3>
            ${documents.map(doc => `
              <div class="document-item">
                <div class="document-item-icon">
                  <i class="fas fa-file-${this.getFileIcon(doc.file_extension)}"></i>
                </div>
                <div class="document-item-info">
                  <h4>${doc.file_name}</h4>
                  <p class="document-item-meta">
                    <span><i class="fas fa-tag"></i> ${doc.document_type || 'Documento'}</span>
                    <span><i class="fas fa-hdd"></i> ${this.formatFileSize(doc.file_size)}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>
                <div class="document-item-actions">
                  <button class="btn btn-sm btn-success" onclick="adminDashboard.downloadDocument(${doc.id}, '${doc.file_name}')" title="Baixar">
                    <i class="fas fa-download"></i> Baixar
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      modal.style.display = 'flex';
    } else {
      this.showNotification(data.error || 'Erro ao carregar documentos', 'error');
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes dos documentos:', error);
    this.showNotification('Erro ao buscar detalhes dos documentos', 'error');
  }
}

// Fechar modal de documentos do cliente
closeClientDocumentsModal() {
  const modal = document.getElementById('clientDocumentsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Download de documento
async downloadDocument(docId, fileName) {
  try {
    const url = `${this.apiEndpoint}?action=download_document&id=${docId}`;
    
    // Se fileName não for passado, tenta usar um nome padrão
    const finalFileName = fileName || `documento_${docId}`;
    
    if (window.__TAURI__) {
      const ext = finalFileName.includes('.') ? finalFileName.split('.').pop().toLowerCase() : 'pdf';
      await this.tauriDownloadFile(url, finalFileName, [{ name: 'Documento', extensions: [ext] }]);
    } else {
      window.open(url, '_blank');
      this.showNotification('Download iniciado!', 'success');
    }
  } catch (error) {
    console.error('Erro ao fazer download:', error);
    this.showNotification('Erro ao fazer download do documento', 'error');
  }
}

// Obter ícone do arquivo baseado na extensão
getFileIcon(extension) {
  const ext = extension ? extension.toLowerCase() : '';
  const iconMap = {
    'pdf': 'pdf',
    'doc': 'word',
    'docx': 'word',
    'xls': 'excel',
    'xlsx': 'excel',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'txt': 'alt',
    'zip': 'archive',
    'rar': 'archive'
  };
  return iconMap[ext] || 'alt';
}

// Formatar tamanho do arquivo
formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============ FIM DAS FUNÇÕES DE GESTÃO DE DOCUMENTOS ============

// ============ FUNÇÕES PARA GESTÃO DE CLIENTES E CONTATOS ============

// Configurar módulo de clientes e contatos
setupClientesContatosModule() {
  // Carregar quando a aba for ativada
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-tab') === 'clientes') {
        this.loadClientesContatos();
      }
    });
  });
  
  // Configurar filtros
  const searchClientes = document.getElementById('searchClientes');
  const searchContatos = document.getElementById('searchContatos');
  
  if (searchClientes) {
    searchClientes.addEventListener('input', (e) => {
      this.filterClientes(e.target.value);
    });
  }
  
  if (searchContatos) {
    searchContatos.addEventListener('input', (e) => {
      this.filterContatos(e.target.value);
    });
  }
}

// Carregar clientes e contatos
async loadClientesContatos() {
  await this.loadClientesList();
  await this.loadContatosList();
  await this.loadClientesContatosStats();
}

// Carregar estatísticas
async loadClientesContatosStats() {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_clients_contatos_stats' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Atualizar cards de estatísticas
      const totalClientesEl = document.querySelector('[data-stat="total-clientes"]');
      const clientesAtivosEl = document.querySelector('[data-stat="clientes-ativos"]');
      const totalContatosEl = document.querySelector('[data-stat="total-contatos"]');
      
      if (totalClientesEl) totalClientesEl.textContent = data.data.total_clientes || 0;
      if (clientesAtivosEl) clientesAtivosEl.textContent = data.data.clientes_ativos || 0;
      if (totalContatosEl) totalContatosEl.textContent = data.data.total_contatos || 0;
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

// Carregar lista de clientes
async loadClientesList() {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_clients_list' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.allClientes = data.data.clients || [];
      this.filteredClientes = [...this.allClientes];
      this.renderClientes(this.filteredClientes);
    }
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    this.showNotification('Erro ao carregar clientes', 'error');
  }
}

// Renderizar lista de clientes
renderClientes(clientes) {
  const container = document.getElementById('clientesListContainer');
  
  if (!container) return;
  
  if (!clientes || clientes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>Nenhum Cliente Encontrado</h3>
        <p>Não há clientes cadastrados no sistema ainda</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="clientes-grid">
      ${clientes.map(client => `
        <div class="cliente-card" onclick="adminDashboard.showClientDetails('${this.escapeHtml(client.client_name)}')" data-testid="cliente-${this.escapeHtml(client.client_name)}">
                  <div class="cliente-icon">
                    <i class="fas fa-user-circle"></i>
                  </div>
                  <div class="cliente-card-content">
                    <h4 class="cliente-name">${this.escapeHtml(client.client_name)}</h4>
                  </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Filtrar clientes por nome
filterClientes(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    this.filteredClientes = [...this.allClientes];
  } else {
    const term = searchTerm.toLowerCase();
    this.filteredClientes = this.allClientes.filter(client =>
      client.client_name.toLowerCase().includes(term)
    );
  }
  
  this.renderClientes(this.filteredClientes);
}

// Mostrar detalhes do cliente com histórico
async showClientDetails(clientName) {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_client_details',
        client_name: clientName
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const client = data.data.client;
      const proposals = data.data.proposals;
      
      const modal = document.getElementById('clientDetailsModal');
      const modalTitle = document.getElementById('clientDetailsModalTitle');
      const modalContent = document.getElementById('clientDetailsModalContent');
      
      modalTitle.innerHTML = `
        <i class="fas fa-user-circle"></i> ${this.escapeHtml(client.client_name)}
      `;
      
      modalContent.innerHTML = `
        <div class="client-details-container">
          <!-- Dados Pessoais -->
          <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Dados Pessoais</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Nome:</span>
                <span class="detail-value">${this.escapeHtml(client.client_name)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">CPF:</span>
                <span class="detail-value">${this.maskCPF(client.cpf)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Telefone:</span>
                <span class="detail-value">${this.escapeHtml(client.telefone || 'Não informado')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${this.escapeHtml(client.email || 'Não informado')}</span>
              </div>
              ${client.data_nascimento ? `
              <div class="detail-item">
                <span class="detail-label">Data de Nascimento:</span>
                <span class="detail-value">${new Date(client.data_nascimento).toLocaleDateString('pt-BR')}</span>
              </div>
              ` : ''}
              ${client.profissao ? `
              <div class="detail-item">
                <span class="detail-label">Profissão:</span>
                <span class="detail-value">${this.escapeHtml(client.profissao)}</span>
              </div>
              ` : ''}
              ${client.renda ? `
              <div class="detail-item">
                <span class="detail-label">Renda:</span>
                <span class="detail-value">R$ ${parseFloat(client.renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              ` : ''}
              ${client.cep ? `
              <div class="detail-item">
                <span class="detail-label">CEP:</span>
                <span class="detail-value">${this.escapeHtml(client.cep)}</span>
              </div>
              ` : ''}
              ${client.endereco ? `
              <div class="detail-item full-width">
                <span class="detail-label">Endereço:</span>
                <span class="detail-value">${this.escapeHtml(client.endereco)}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Histórico de Propostas -->
          <div class="detail-section">
            <h3><i class="fas fa-history"></i> Histórico de Propostas (${proposals.length})</h3>
            ${proposals.length === 0 ? `
              <p class="no-data">Nenhuma proposta encontrada</p>
            ` : `
              <div class="proposals-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Especialista</th>
                      <th>Veículo</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Banco</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${proposals.map(prop => `
                      <tr>
                        <td>#${prop.id}</td>
                        <td>${this.escapeHtml(prop.specialist || 'N/A')}</td>
                        <td>
                          ${this.escapeHtml(prop.marca_veiculo || '')} ${this.escapeHtml(prop.modelo_veiculo || '')}<br>
                          <small>${prop.ano_fabricacao || 'N/A'}/${prop.ano_modelo || 'N/A'}</small>
                        </td>
                        <td>R$ ${parseFloat(prop.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span class="status-badge status-${prop.status}">${this.getStatusText(prop.status)}</span>
                        </td>
                        <td>${prop.banco ? this.getBankBadge(prop.banco) : '-'}</td>
                        <td>${new Date(prop.created_at).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <button class="btn btn-sm btn-primary" onclick="adminDashboard.showProposalDetails('${prop.id}')" title="Ver Detalhes">
                            <i class="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;
      
      modal.style.display = 'flex';
    } else {
      this.showNotification(data.error || 'Erro ao carregar detalhes do cliente', 'error');
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes do cliente:', error);
    this.showNotification('Erro ao buscar detalhes do cliente', 'error');
  }
}

// Fechar modal de detalhes do cliente
closeClientDetailsModal() {
  const modal = document.getElementById('clientDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Carregar lista de contatos
async loadContatosList() {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_contatos_list' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.allContatos = data.data.contatos || [];
      this.filteredContatos = [...this.allContatos];
      this.renderContatos(this.filteredContatos);
    }
  } catch (error) {
    console.error('Erro ao carregar contatos:', error);
    this.showNotification('Erro ao carregar contatos', 'error');
  }
}

// Renderizar lista de contatos
renderContatos(contatos) {
  const container = document.getElementById('contatosListContainer');
  
  if (!container) return;
  
  if (!contatos || contatos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-address-book"></i>
        <h3>Nenhum Contato Encontrado</h3>
        <p>Clique em "Adicionar Contato" para começar</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="contatos-grid">
      ${contatos.map(contato => `
                <div class="contato-card" onclick="adminDashboard.showContatoDetails(${contato.id})" data-testid="contato-${contato.id}">
                  <div class="contato-icon">
                    <i class="fas fa-handshake"></i>
                  </div>
                  <div class="contato-card-content">
                    <h4 class="contato-name">${this.escapeHtml(contato.nome_fantasia || contato.nome)}</h4>
                  </div>
                </div>
      `).join('')}
    </div>
  `;
}

// Filtrar contatos por nome ou nome fantasia
filterContatos(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    this.filteredContatos = [...this.allContatos];
  } else {
    const term = searchTerm.toLowerCase();
    this.filteredContatos = this.allContatos.filter(contato =>
      contato.nome.toLowerCase().includes(term) ||
      contato.nome_fantasia.toLowerCase().includes(term)
    );
  }
  
  this.renderContatos(this.filteredContatos);
}

// Abrir modal para adicionar contato
openAddContatoModal() {
  const modal = document.getElementById('contatoModal');
  const modalTitle = document.getElementById('contatoModalTitle');
  const form = document.getElementById('contatoForm');
  
  modalTitle.textContent = 'Adicionar Novo Contato';
  form.reset();
  document.getElementById('contatoId').value = '';
  
  modal.style.display = 'flex';
}

// Fechar modal de contato
closeContatoModal() {
  const modal = document.getElementById('contatoModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Salvar contato (criar ou atualizar)
async saveContato() {
  const contatoId = document.getElementById('contatoId').value;
  const nome = document.getElementById('contatoNome').value.trim();
  const nomeFantasia = document.getElementById('contatoNomeFantasia').value.trim();
  const local = document.getElementById('contatoLocal').value.trim();
  const telefone = document.getElementById('contatoTelefone').value.trim();
  const nomeLoja = document.getElementById('contatoNomeLoja').value.trim();
  const cnpj = document.getElementById('contatoCNPJ').value.trim();
  
  // Validações
  if (!nome) {
    this.showNotification('Nome é obrigatório', 'error');
    return;
  }
  if (!nomeFantasia) {
    this.showNotification('Nome Fantasia é obrigatório', 'error');
    return;
  }
  
  const contatoData = {
    nome: nome,
    nome_fantasia: nomeFantasia,
    local: local || null,
    telefone: telefone || null,
    nome_loja: nomeLoja || null,
    cnpj: cnpj || null
  };
  
  try {
    const action = contatoId ? 'update_contato' : 'create_contato';
    if (contatoId) {
      contatoData.contato_id = parseInt(contatoId);
    }
    
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, ...contatoData })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showNotification(contatoId ? 'Contato atualizado!' : 'Contato criado!', 'success');
      this.closeContatoModal();
      this.loadContatosList();
      this.loadClientesContatosStats();
    } else {
      this.showNotification(data.error || 'Erro ao salvar contato', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar contato:', error);
    this.showNotification('Erro ao salvar contato', 'error');
  }
}

// Mostrar detalhes do contato
async showContatoDetails(contatoId) {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_contato_details',
        contato_id: contatoId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const contato = data.data.contato;
      
      const modal = document.getElementById('contatoDetailsModal');
      const modalTitle = document.getElementById('contatoDetailsModalTitle');
      const modalContent = document.getElementById('contatoDetailsModalContent');
      
      modalTitle.innerHTML = `
        <i class="fas fa-handshake"></i> ${this.escapeHtml(contato.nome_fantasia || contato.nome)}
      `;
      
      modalContent.innerHTML = `
        <div class="contato-details-container">
          <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Informações do Contato</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Nome:</span>
                <span class="detail-value">${this.escapeHtml(contato.nome)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Nome Fantasia:</span>
                <span class="detail-value">${this.escapeHtml(contato.nome_fantasia)}</span>
              </div>
              ${contato.telefone ? `
              <div class="detail-item">
                <span class="detail-label">Telefone:</span>
                <span class="detail-value">${this.escapeHtml(contato.telefone)}</span>
              </div>
              ` : ''}
              ${contato.local ? `
              <div class="detail-item">
                <span class="detail-label">Local:</span>
                <span class="detail-value">${this.escapeHtml(contato.local)}</span>
              </div>
              ` : ''}
              ${contato.nome_loja ? `
              <div class="detail-item">
                <span class="detail-label">Nome da Loja:</span>
                <span class="detail-value">${this.escapeHtml(contato.nome_loja)}</span>
              </div>
              ` : ''}
              ${contato.cnpj ? `
              <div class="detail-item">
                <span class="detail-label">CNPJ:</span>
                <span class="detail-value">${this.maskCNPJ(contato.cnpj)}</span>
              </div>
              ` : ''}
      <div class="detail-item">
        <span class="detail-label">Banco:</span>
        <span class="detail-value">${proposal.bank_name || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Data da Proposta:</span>
        <span class="detail-value">${proposal.data_proposta ? this.formatDateWithoutTimezone(proposal.data_proposta) : '-'}</span>
      </div>
    </div>
          </div>
          
          <div class="contato-actions">
            <button class="btn btn-primary" onclick="adminDashboard.editContato(${contato.id})">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-danger" onclick="adminDashboard.deleteContato(${contato.id}, '${this.escapeHtml(contato.nome_fantasia || contato.nome)}')">
              <i class="fas fa-trash"></i> Deletar
            </button>
            <button class="btn btn-secondary" onclick="adminDashboard.closeContatoDetailsModal()">
              <i class="fas fa-times"></i> Fechar
            </button>
          </div>
        </div>
      `;
      
      modal.style.display = 'flex';
    } else {
      this.showNotification(data.error || 'Erro ao carregar detalhes do contato', 'error');
    }
  } catch (error) {
    console.error('Erro ao buscar detalhes do contato:', error);
    this.showNotification('Erro ao buscar detalhes do contato', 'error');
  }
}

// Fechar modal de detalhes do contato
closeContatoDetailsModal() {
  const modal = document.getElementById('contatoDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Editar contato
async editContato(contatoId) {
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'get_contato_details',
        contato_id: contatoId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const contato = data.data.contato;
      
      // Fechar modal de detalhes
      this.closeContatoDetailsModal();
      
      // Abrir modal de edição com dados preenchidos
      const modal = document.getElementById('contatoModal');
      const modalTitle = document.getElementById('contatoModalTitle');
      
      modalTitle.textContent = 'Editar Contato';
      document.getElementById('contatoId').value = contato.id;
      document.getElementById('contatoNome').value = contato.nome;
      document.getElementById('contatoNomeFantasia').value = contato.nome_fantasia;
      document.getElementById('contatoLocal').value = contato.local || '';
      document.getElementById('contatoTelefone').value = contato.telefone || '';
      document.getElementById('contatoNomeLoja').value = contato.nome_loja || '';
      document.getElementById('contatoCNPJ').value = contato.cnpj || '';
      
      modal.style.display = 'flex';
    } else {
      this.showNotification(data.error || 'Erro ao carregar contato', 'error');
    }
  } catch (error) {
    console.error('Erro ao carregar contato para edição:', error);
    this.showNotification('Erro ao carregar contato', 'error');
  }
}

// Deletar contato
async deleteContato(contatoId, contatoNome) {
  if (!confirm(`Tem certeza que deseja deletar o contato "${contatoNome}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_contato',
        contato_id: contatoId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      this.showNotification('Contato deletado com sucesso!', 'success');
      this.closeContatoDetailsModal();
      this.loadContatosList();
      this.loadClientesContatosStats();
    } else {
      this.showNotification(data.error || 'Erro ao deletar contato', 'error');
    }
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    this.showNotification('Erro ao deletar contato', 'error');
  }
}

// Funções auxiliares
escapeHtml(text) {
  if (!text) return '';
  const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
          };
          return String(text).replace(/[&<>"']/g, (m) => map[m]);
        }

maskCPF(cpf) {
  if (!cpf) return 'Não informado';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

maskCNPJ(cnpj) {
  if (!cnpj) return 'Não informado';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}
// ============ FIM DAS FUNÇÕES PARA GESTÃO DE CLIENTES E CONTATOS ============

/**
 * Configurar módulo de contratos
 */
setupContratosModule() {
    // Event listener para filtro de busca
    const searchContratosCliente = document.getElementById('searchContratosCliente');
    if (searchContratosCliente) {
        searchContratosCliente.addEventListener('input', (e) => {
            this.filterContratos(e.target.value);
        });
    }
    
    // Carregar contratos quando a aba for ativada
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-tab') === 'contratos') {
                this.loadContratos();
                this.loadContratosStats();
            }
        });
    });
}

/**
 * Carregar estatísticas de contratos
 */
async loadContratosStats() {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_contratos_stats' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const totalEl = document.getElementById('totalContratosCount');
            const recentesEl = document.getElementById('contratosRecentesCount');
            const clientesEl = document.getElementById('clientesUnicosCount');
            
            if (totalEl) totalEl.textContent = data.data.total_contratos || 0;
            if (recentesEl) recentesEl.textContent = data.data.contratos_recentes || 0;
            if (clientesEl) clientesEl.textContent = data.data.clientes_unicos || 0;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas de contratos:', error);
    }
}

/**
 * Carregar lista de contratos
 */
async loadContratos() {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_contratos' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.allContratos = data.data.contratos || [];
            this.filteredContratos = [...this.allContratos];
            this.renderContratos(this.filteredContratos);
        }
    } catch (error) {
        console.error('Erro ao carregar contratos:', error);
        this.showNotification('Erro ao carregar contratos', 'error');
    }
}

/**
 * Renderizar lista de contratos
 */
renderContratos(contratos) {
    const container = document.getElementById('contratosContainer');
    
    if (!container) return;
    
    if (!contratos || contratos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-contract"></i>
                <h3>Nenhum Contrato Encontrado</h3>
                <p>Clique em "Adicionar Contrato" para começar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="contratos-grid">
            ${contratos.map(contrato => `
                <div class="contrato-card" onclick="adminDashboard.showContratoDetails(${contrato.id})" data-testid="contrato-${contrato.id}">
                    <div class="contrato-card-header">
                        <div class="contrato-icon">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <div class="contrato-info">
                            <h4 class="contrato-cliente-name">${this.escapeHtml(contrato.nome_cliente)}</h4>
                            <p class="contrato-meta">
                                <i class="fas fa-phone"></i> ${this.escapeHtml(contrato.telefone)}
                            </p>
                        </div>
                    </div>
                    <div class="contrato-card-body">
                        <div class="contrato-file-info">
                            <i class="fas fa-file-pdf" style="color: #dc2626;"></i>
                            <span>${this.escapeHtml(contrato.arquivo_nome)}</span>
                        </div>
                        <div class="contrato-file-size">
                            <i class="fas fa-hdd"></i> ${contrato.tamanho_kb} KB
                        </div>
                    </div>
                    <div class="contrato-card-footer">
                        <small>
                            <i class="fas fa-calendar"></i> 
                            ${new Date(contrato.created_at).toLocaleDateString('pt-BR')}
                        </small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Filtrar contratos por nome do cliente
 */
filterContratos(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        this.filteredContratos = [...this.allContratos];
    } else {
        const term = searchTerm.toLowerCase();
        this.filteredContratos = this.allContratos.filter(contrato =>
            contrato.nome_cliente.toLowerCase().includes(term) ||
            contrato.telefone.includes(term)
        );
    }
    
    this.renderContratos(this.filteredContratos);
}

/**
 * Abrir modal de adicionar contrato
 */
openAddContratoModal() {
    const modal = document.getElementById('contratoAddModal');
    const form = document.getElementById('contratoAddForm');
    
    if (form) form.reset();
    if (modal) modal.style.display = 'flex';
}

/**
 * Fechar modal de adicionar contrato
 */
closeContratoAddModal() {
    const modal = document.getElementById('contratoAddModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Fazer upload de contrato
 */
async uploadContrato() {
    const nomeCliente = document.getElementById('contratoNomeCliente').value.trim();
    const telefone = document.getElementById('contratoTelefone').value.trim();
    let arquivo = document.getElementById('contratoArquivo').files[0];
    if (!arquivo && window.__TAURI__) { arquivo = await tauriOpenFile([{ name: 'PDF', extensions: ['pdf'] }]); }
    
    // Validações
    if (!nomeCliente) {
        this.showNotification('Nome do cliente é obrigatório', 'error');
        return;
    }
    
    if (!telefone) {
        this.showNotification('Telefone é obrigatório', 'error');
        return;
    }
    
    if (!arquivo) {
        this.showNotification('Por favor, selecione um arquivo PDF', 'error');
        return;
    }
    
    // Verificar se é PDF
    if (arquivo.type !== 'application/pdf') {
        this.showNotification('Apenas arquivos PDF são permitidos', 'error');
        return;
    }
    
    // Verificar tamanho (50MB)
    if (arquivo.size > 50 * 1024 * 1024) {
        this.showNotification('Arquivo muito grande. Tamanho máximo: 50MB', 'error');
        return;
    }
    
    // Criar FormData
    const formData = new FormData();
    formData.append('action', 'upload_contrato');
    formData.append('nome_cliente', nomeCliente);
    formData.append('telefone', telefone);
    formData.append('arquivo', arquivo);
    
    try {
        this.showNotification('Enviando contrato...', 'info');
        
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Contrato adicionado com sucesso!', 'success');
            this.closeContratoAddModal();
            this.loadContratos();
            this.loadContratosStats();
        } else {
            this.showNotification(data.error || 'Erro ao adicionar contrato', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer upload do contrato:', error);
        this.showNotification('Erro ao fazer upload do contrato', 'error');
    }
}

/**
 * Mostrar detalhes do contrato
 */
async showContratoDetails(contratoId) {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_contrato_details',
                id: contratoId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const contrato = data.data.contrato;
            
            const modal = document.getElementById('contratoDetailsModal');
            const modalTitle = document.getElementById('contratoDetailsModalTitle');
            const modalContent = document.getElementById('contratoDetailsModalContent');
            const modalActions = document.getElementById('contratoDetailsActions');
            
            modalTitle.innerHTML = `
                <i class="fas fa-file-contract"></i> Contrato - ${this.escapeHtml(contrato.nome_cliente)}
            `;
            
            modalContent.innerHTML = `
                <div class="contrato-details-container">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Informações do Contrato</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Cliente:</span>
                                <span class="detail-value">${this.escapeHtml(contrato.nome_cliente)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Telefone:</span>
                                <span class="detail-value">${this.escapeHtml(contrato.telefone)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Arquivo:</span>
                                <span class="detail-value">
                                    <i class="fas fa-file-pdf" style="color: #dc2626;"></i>
                                    ${this.escapeHtml(contrato.arquivo_nome)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tamanho:</span>
                                <span class="detail-value">${contrato.tamanho_kb} KB</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Data de Upload:</span>
                                <span class="detail-value">
                                    ${new Date(contrato.created_at).toLocaleDateString('pt-BR')} às 
                                    ${new Date(contrato.created_at).toLocaleTimeString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            modalActions.innerHTML = `
                <button class="btn btn-danger" onclick="adminDashboard.deleteContrato(${contrato.id})">
                    <i class="fas fa-trash"></i> Excluir Contrato
                </button>
                <button class="btn btn-success" onclick="adminDashboard.downloadContrato(${contrato.id})">
                    <i class="fas fa-download"></i> Baixar Arquivo
                </button>
            `;
            
            modal.style.display = 'flex';
        } else {
            this.showNotification(data.error || 'Erro ao buscar detalhes do contrato', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar detalhes do contrato:', error);
        this.showNotification('Erro ao buscar detalhes do contrato', 'error');
    }
}

/**
 * Fechar modal de detalhes do contrato
 */
closeContratoDetailsModal() {
    const modal = document.getElementById('contratoDetailsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Baixar contrato
 */
async downloadContrato(contratoId) {
    const downloadUrl = `${this.apiEndpoint}?action=download_contrato&id=${contratoId}`;
    if (window.__TAURI__) {
      await this.tauriDownloadFile(downloadUrl, `contrato_${contratoId}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }]);
    } else {
      window.open(downloadUrl, '_blank');
    }
}

/**
 * Excluir contrato
 */
async deleteContrato(contratoId) {
    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação é irreversível.')) {
        return;
    }
    
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_contrato',
                id: contratoId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Contrato excluído com sucesso!', 'success');
            this.closeContratoDetailsModal();
            this.loadContratos();
            this.loadContratosStats();
        } else {
            this.showNotification(data.error || 'Erro ao excluir contrato', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir contrato:', error);
        this.showNotification('Erro ao excluir contrato', 'error');
    }
}

// ============ FIM DAS FUNÇÕES PARA GESTÃO DE CONTRATOS ============

// ==================== MÓDULO DE NOTAS FISCAIS ====================

setupNotasFiscaisModule() {
    // Adicionar evento de submit ao formulário de upload
    const form = document.getElementById('notaFiscalAddForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadNotaFiscal();
        });
    }
}

openUploadNotaFiscalModal() {
    document.getElementById('notaFiscalAddModal').style.display = 'flex';
    // Limpar formulário
    document.getElementById('notaFiscalAddForm').reset();
}

closeNotaFiscalAddModal() {
    document.getElementById('notaFiscalAddModal').style.display = 'none';
}

async uploadNotaFiscal() {
    const form = document.getElementById('notaFiscalAddForm');
    const formData = new FormData(form);

    // O FormData não inclui o 'action' por padrão, então adicionamos
    formData.append('action', 'upload_nota_fiscal');
    
    // Adicionar o arquivo
    const fileInput = document.getElementById('notaFiscalArquivo');
    if (fileInput.files.length === 0) {
        this.showNotification('Por favor, selecione um arquivo para upload.', 'error');
        return;
    }
    
    // Os campos de texto agora têm o atributo 'name' no HTML e são coletados automaticamente pelo FormData(form).
    // Não é mais necessário adicionar manualmente.

    try {
        this.showNotification('Enviando Nota Fiscal...', 'info');
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            this.showNotification('Nota Fiscal enviada com sucesso!', 'success');
            this.closeNotaFiscalAddModal();
            await this.loadNotasFiscais(); // Recarregar a lista
        } else {
            this.showNotification(`Erro ao enviar Nota Fiscal: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro no upload de nota fiscal:', error);
        this.showNotification('Erro de conexão ao enviar Nota Fiscal.', 'error');
    }
}

async loadNotasFiscais() {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_notas_fiscais' })
        });

        const data = await response.json();

        if (data.success) {
            this.allNotasFiscais = data.data.notas_fiscais || [];
            this.filteredNotasFiscais = [...this.allNotasFiscais];
            this.renderNotasFiscais(this.filteredNotasFiscais);
            this.loadNotasFiscaisStats();
        } else {
            this.showNotification(`Erro ao carregar Notas Fiscais: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao carregar notas fiscais:', error);
        this.showNotification('Erro de conexão ao carregar Notas Fiscais.', 'error');
    }
}

async loadNotasFiscaisStats() {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_notas_fiscais_stats' })
        });

        const data = await response.json();

        if (data.success) {
            this.renderNotasFiscaisStats(data.data);
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas de notas fiscais:', error);
    }
}

renderNotasFiscaisStats(stats) {
    const container = document.getElementById('notasFiscaisStats');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-card" data-filter="all" style="cursor: default;">
            <div class="stat-icon" style="background: #dbeafe; color: #2563eb;">
                <i class="fas fa-receipt"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.total_notas || 0}</h3>
                <p>Total de Notas</p>
            </div>
        </div>
        <div class="stat-card" data-filter="xml" style="cursor: default;">
            <div class="stat-icon" style="background: #f3e8ff; color: #9333ea;">
                <i class="fas fa-file-code"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.notas_xml || 0}</h3>
                <p>Arquivos XML</p>
            </div>
        </div>
        <div class="stat-card" data-filter="pdf" style="cursor: default;">
            <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.notas_pdf || 0}</h3>
                <p>Arquivos PDF</p>
            </div>
        </div>
        <div class="stat-card" data-filter="mes" style="cursor: default;">
            <div class="stat-icon" style="background: #d1fae5; color: #059669;">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="stat-content">
                <h3>${stats.notas_mes_atual || 0}</h3>
                <p>Notas deste Mês</p>
            </div>
        </div>
    `;
}

renderNotasFiscais(notasFiscais) {
    const tableBody = document.querySelector('#notasFiscaisTable tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (notasFiscais.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma nota fiscal encontrada.</td></tr>';
        return;
    }

    notasFiscais.forEach(nf => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${nf.id}</td>
            <td>${nf.nome_cliente || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="adminDashboard.openNotaFiscalDetailsModal(${nf.id})">
                    <i class="fas fa-eye"></i> ${nf.arquivo_nome}
                </button>
            </td>
            <td>${this.formatFileSize(nf.arquivo_tamanho)}</td>
            <td>${this.formatDate(nf.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteNotaFiscal(${nf.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
    });
}

openNotaFiscalDetailsModal(id) {
    const notaFiscal = this.allNotasFiscais.find(nf => nf.id === id);
    if (!notaFiscal) {
        this.showNotification('Detalhes da Nota Fiscal não encontrados.', 'error');
        return;
    }

    const modal = document.getElementById('notaFiscalDetailsModal');
    const content = document.getElementById('notaFiscalDetailsModalContent');
    const actions = document.getElementById('notaFiscalDetailsActions');

    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><strong>ID:</strong> ${notaFiscal.id}</div>
            <div class="detail-item"><strong>Cliente:</strong> ${notaFiscal.nome_cliente || 'N/A'}</div>
            <div class="detail-item"><strong>Telefone:</strong> ${notaFiscal.telefone || 'N/A'}</div>
            <div class="detail-item"><strong>E-mail:</strong> ${notaFiscal.email || 'N/A'}</div>
            <div class="detail-item"><strong>CPF:</strong> ${notaFiscal.cpf || 'N/A'}</div>
            <div class="detail-item"><strong>Local:</strong> ${notaFiscal.local || 'N/A'}</div>
            <div class="detail-item"><strong>Data NF:</strong> ${this.formatDate(notaFiscal.data) || 'N/A'}</div>
            <div class="detail-item"><strong>Arquivo:</strong> ${notaFiscal.arquivo_nome}</div>
            <div class="detail-item"><strong>Tamanho:</strong> ${this.formatFileSize(notaFiscal.arquivo_tamanho)}</div>
            <div class="detail-item"><strong>Tipo:</strong> ${notaFiscal.arquivo_tipo.toUpperCase()}</div>
            <div class="detail-item"><strong>Upload:</strong> ${this.formatDateTime(notaFiscal.created_at)}</div>
        </div>
    `;

    actions.innerHTML = `
        <button class="btn btn-secondary" onclick="adminDashboard.closeNotaFiscalDetailsModal()">Fechar</button>
        <button class="btn btn-primary" onclick="adminDashboard.downloadNotaFiscal(${notaFiscal.id})">
            <i class="fas fa-download"></i> Baixar Arquivo
        </button>
    `;

    modal.style.display = 'flex';
}

closeNotaFiscalDetailsModal() {
    document.getElementById('notaFiscalDetailsModal').style.display = 'none';
}

async downloadNotaFiscal(id) {
    try {
        this.showNotification('Preparando download...', 'info');
        const url = `${this.apiEndpoint}?action=download_nota_fiscal&nota_fiscal_id=${id}`;
        if (window.__TAURI__) {
            await this.tauriDownloadFile(url, `nota_fiscal_${id}.pdf`, [{ name: 'Nota Fiscal', extensions: ['pdf', 'xml'] }]);
        } else {
            window.location.href = url;
            this.showNotification('Download iniciado.', 'success');
        }
    } catch (error) {
        console.error('Erro ao iniciar download:', error);
        this.showNotification('Erro ao iniciar download da Nota Fiscal.', 'error');
    }
}

async deleteNotaFiscal(id) {
    if (!confirm('Tem certeza que deseja excluir esta Nota Fiscal? Esta ação é irreversível.')) {
        return;
    }

    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_nota_fiscal', nota_fiscal_id: id })
        });

        const data = await response.json();

        if (data.success) {
            this.showNotification('Nota Fiscal excluída com sucesso!', 'success');
            await this.loadNotasFiscais(); // Recarregar a lista
        } else {
            this.showNotification(`Erro ao excluir Nota Fiscal: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir nota fiscal:', error);
        this.showNotification('Erro de conexão ao excluir Nota Fiscal.', 'error');
    }
}

// ============ FUNÇÕES PARA GESTÃO DE CONTRATOS ============

// ============ FUNÇÕES PARA GESTÃO DE DOCUMENTOS DOS ESPECIALISTAS ============

/**
 * Configurar abas de documentos para especialistas
 */
setupSpecialistDocumentsTabs() {
    const specialists = ['Fabricio', 'Neto', 'Wandreyna', 'Eder', 'Suzana'];
    
    specialists.forEach(specialist => {
        const specialistKey = specialist.toLowerCase();
        
        // Event listener para a aba de documentos
        const docTab = document.querySelector(`[data-tab="documentos-${specialistKey}"]`);
        if (docTab) {
            docTab.addEventListener('click', () => {
                this.showSpecialistDocumentsTab(specialistKey, specialist);
            });
        }
        
        // Event listener para a aba de propostas
        const propTab = document.querySelector(`[data-tab="propostas-${specialistKey}"]`);
        if (propTab) {
            propTab.addEventListener('click', () => {
                this.showSpecialistProposalsTab(specialistKey);
            });
        }
        
        // Event listener para filtro de busca de documentos
        const searchInput = document.getElementById(`searchClientDocuments${specialist}`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterSpecialistDocuments(specialistKey, e.target.value);
            });
        }
    });
}

/**
 * Mostrar aba de documentos do especialista
 */
showSpecialistDocumentsTab(specialistKey, specialistName) {
    // Atualizar abas ativas
    document.querySelectorAll(`#${specialistKey} .tab-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    const docTabBtn = document.querySelector(`[data-tab="documentos-${specialistKey}"]`);
    if (docTabBtn) docTabBtn.classList.add('active');
    
    // Atualizar conteúdo ativo
    document.querySelectorAll(`#${specialistKey} .tab-content`).forEach(content => {
        content.classList.remove('active');
    });
    const docTabContent = document.querySelector(`[data-tab-content="documentos-${specialistKey}"]`);
    if (docTabContent) docTabContent.classList.add('active');
    
    // Carregar documentos do especialista
    this.loadSpecialistDocuments(specialistKey, specialistName);
}

/**
 * Mostrar aba de propostas do especialista
 */
showSpecialistProposalsTab(specialistKey) {
    // Atualizar abas ativas
    document.querySelectorAll(`#${specialistKey} .tab-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    const propTabBtn = document.querySelector(`[data-tab="propostas-${specialistKey}"]`);
    if (propTabBtn) propTabBtn.classList.add('active');
    
    // Atualizar conteúdo ativo
    document.querySelectorAll(`#${specialistKey} .tab-content`).forEach(content => {
        content.classList.remove('active');
    });
    const propTabContent = document.querySelector(`[data-tab-content="propostas-${specialistKey}"]`);
    if (propTabContent) propTabContent.classList.add('active');
}

/**
 * Carregar documentos do especialista
 */
async loadSpecialistDocuments(specialistKey, specialistName) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list_proposal_documents',
                specialist_field: specialistKey
            })
        });

        const data = await response.json();

        if (data.success) {
            const documents = data.data.documents || [];
            
            // Agrupar documentos por cliente
            const documentsByClient = {};
            documents.forEach(doc => {
                if (!documentsByClient[doc.client_name]) {
                    documentsByClient[doc.client_name] = {
                        client_name: doc.client_name,
                        proposal_id: doc.proposal_id,
                        documents: []
                    };
                }
                documentsByClient[doc.client_name].documents.push(doc);
            });
            
            // Armazenar para filtragem
            this[`allClientDocuments${capitalizedKey}`] = Object.values(documentsByClient);
            this[`filteredClientDocuments${capitalizedKey}`] = [...this[`allClientDocuments${capitalizedKey}`]];
            
            // Atualizar estatísticas
            const totalDocs = documents.length;
            const totalClients = Object.keys(documentsByClient).length;
            
            const totalDocsEl = document.getElementById(`totalDocumentsCount${capitalizedKey}`);
            const totalClientsEl = document.getElementById(`totalClientsWithDocsCount${capitalizedKey}`);
            
            if (totalDocsEl) totalDocsEl.textContent = totalDocs;
            if (totalClientsEl) totalClientsEl.textContent = totalClients;
            
            // Renderizar documentos
            this.renderSpecialistDocuments(specialistKey, capitalizedKey, this[`filteredClientDocuments${capitalizedKey}`]);
        }
    } catch (error) {
        console.error(`Erro ao carregar documentos do especialista ${specialistName}:`, error);
        this.showNotification(`Erro ao carregar documentos`, 'error');
    }
}

/**
 * Renderizar documentos do especialista
 */
renderSpecialistDocuments(specialistKey, capitalizedKey, clientsData) {
    const container = document.getElementById(`clientDocumentsContainer${capitalizedKey}`);
    
    if (!container) return;
    
    if (!clientsData || clientsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>Nenhum Documento Encontrado</h3>
                <p>Ainda não há documentos enviados para suas propostas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="clients-documents-grid">
            ${clientsData.map(client => `
                <div class="client-docs-card" data-testid="client-docs-${client.proposal_id}">
                    <div class="client-docs-header">
                        <div class="client-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="client-info">
                            <h4>${this.escapeHtml(client.client_name)}</h4>
                            <p><i class="fas fa-file-alt"></i> ${client.documents.length} documento(s)</p>
                        </div>
                    </div>
                    <div class="client-docs-body">
                        ${client.documents.map(doc => `
                            <div class="document-item" data-testid="document-${doc.id}">
                                <div class="document-icon">
                                    <i class="fas ${this.getFileIcon(doc.file_name)}"></i>
                                </div>
                                <div class="document-info">
                                    <div class="document-name">${this.escapeHtml(doc.file_name)}</div>
                                    <div class="document-meta">
                                        <span><i class="fas fa-calendar"></i> ${new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}</span>
                                        <span><i class="fas fa-hdd"></i> ${(doc.file_size / 1024).toFixed(2)} KB</span>
                                    </div>
                                </div>
                                <button class="btn-icon-download" onclick="adminDashboard.downloadDocument(${doc.id}, '${this.escapeHtml(doc.file_name)}')" title="Baixar documento">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Filtrar documentos do especialista
 */
filterSpecialistDocuments(specialistKey, searchTerm) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    
    if (!searchTerm || searchTerm.trim() === '') {
        this[`filteredClientDocuments${capitalizedKey}`] = [...this[`allClientDocuments${capitalizedKey}`]];
    } else {
        const term = searchTerm.toLowerCase();
        this[`filteredClientDocuments${capitalizedKey}`] = this[`allClientDocuments${capitalizedKey}`].filter(client =>
            client.client_name.toLowerCase().includes(term)
        );
    }
    
    this.renderSpecialistDocuments(specialistKey, capitalizedKey, this[`filteredClientDocuments${capitalizedKey}`]);
}

// ============ FIM DAS FUNÇÕES PARA GESTÃO DE DOCUMENTOS DOS ESPECIALISTAS ============

// ============ FUNÇÕES PARA GESTÃO DE CLIENTES DOS ESPECIALISTAS ============

/**
 * Configura as abas de clientes para cada especialista
 */
setupSpecialistClientesTabs() {
  const specialists = ['Fabricio', 'Neto', 'Wandreyna', 'Eder', 'Suzana'];
  
    specialists.forEach(specialist => {
      const specialistKey = specialist.toLowerCase();
      
      // Event listener para a aba de clientes
      const clienteTab = document.querySelector(`[data-tab="clientes-${specialistKey}"]`);
      if (clienteTab) {
        clienteTab.addEventListener('click', () => {
          this.showSpecialistClientesTab(specialistKey, specialist);
        });
      }
      
      // Event listener para filtro de busca de clientes
      const searchInput = document.getElementById(`searchClientes${specialist}`);
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.filterSpecialistClientes(specialistKey, e.target.value);
        });
      }

      // Event listener para a aba de contratos
      const contratoTab = document.querySelector(`[data-tab="contratos-${specialistKey}"]`);
      if (contratoTab) {
        contratoTab.addEventListener('click', () => {
          this.showSpecialistContratosTab(specialistKey, specialist);
        });
      }

      // Event listener para filtro de busca de contratos
      const searchContratoInput = document.getElementById(`searchContratos${specialist}`);
      if (searchContratoInput) {
        searchContratoInput.addEventListener('input', (e) => {
          this.filterSpecialistContratos(specialistKey, e.target.value);
        });
      }
    });
  }


/**
 * Mostra a aba de clientes do especialista e carrega os dados
 */
showSpecialistClientesTab(specialistKey, specialistName) {
  const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
  
  // Atualizar abas ativas
  document.querySelectorAll(`#${specialistKey} .tab-btn`).forEach(btn => {
    btn.classList.remove('active');
  });
  const clienteTabBtn = document.querySelector(`[data-tab="clientes-${specialistKey}"]`);
  if (clienteTabBtn) clienteTabBtn.classList.add('active');
  
  // Atualizar conteúdo ativo
  document.querySelectorAll(`#${specialistKey} .tab-content`).forEach(content => {
    content.classList.remove('active');
  });
  const clienteTabContent = document.querySelector(`[data-tab-content="clientes-${specialistKey}"]`);
  if (clienteTabContent) clienteTabContent.classList.add('active');
  
  // Carregar clientes do especialista
  this.loadSpecialistClientes(specialistKey, specialistName);
}

/**
 * Carrega a lista de clientes baseada nas propostas do especialista
 */
async loadSpecialistClientes(specialistKey, specialistName) {
  const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
  
  try {
    // Usar as propostas já carregadas ou carregar se necessário
    let proposals = this.specialistProposals[specialistKey];
    
    if (!proposals || proposals.length === 0) {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_specialist_proposals',
          specialist: specialistKey
        })
      });
      const data = await response.json();
      if (data.success) {
        proposals = data.data.proposals || [];
        this.specialistProposals[specialistKey] = proposals;
      }
    }

    // Agrupar por cliente único
    const clientsMap = {};
    proposals.forEach(prop => {
      if (!clientsMap[prop.client_name]) {
        clientsMap[prop.client_name] = {
          client_name: prop.client_name,
          status: prop.status,
          proposals_count: 0,
          last_proposal_date: prop.created_at
        };
      }
      clientsMap[prop.client_name].proposals_count++;
      // Manter a data mais recente
      if (new Date(prop.created_at) > new Date(clientsMap[prop.client_name].last_proposal_date)) {
        clientsMap[prop.client_name].last_proposal_date = prop.created_at;
      }
    });

    const clientsList = Object.values(clientsMap);
    
    // Armazenar para filtragem
    this[`allClientes${capitalizedKey}`] = clientsList;
    this[`filteredClientes${capitalizedKey}`] = [...clientsList];
    
    // Atualizar estatísticas
    const totalClientes = clientsList.length;
    const clientesAtivos = clientsList.filter(c => c.status !== 'rejected' && c.status !== 'cancelled').length;
    
    const totalClientesEl = document.getElementById(`totalClientesCount${capitalizedKey}`);
    const ativosClientesEl = document.getElementById(`clientesAtivosCount${capitalizedKey}`);
    
    if (totalClientesEl) totalClientesEl.textContent = totalClientes;
    if (ativosClientesEl) ativosClientesEl.textContent = clientesAtivos;
    
    // Renderizar a grid
    this.renderSpecialistClientesGrid(specialistKey);
    
  } catch (error) {
    console.error(`Erro ao carregar clientes do especialista ${specialistName}:`, error);
  }
}

/**
 * Renderiza a grid de clientes para o especialista
 */
  renderSpecialistClientesGrid(specialistKey) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const container = document.getElementById(`clientesGridContainer${capitalizedKey}`);
    const clients = this[`filteredClientes${capitalizedKey}`] || [];
    
    if (!container) return;
    
    if (clients.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <h3>Nenhum cliente encontrado</h3>
          <p>Não há clientes correspondentes aos critérios de busca.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="clientes-grid">
        ${clients.map(client => `
          <div class="cliente-card" onclick="adminDashboard.showSpecialistClientPopup('${this.escapeHtml(client.client_name)}')" style="cursor: pointer;">
            <div class="cliente-icon">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="cliente-card-content">
              <h4 class="cliente-name">${this.escapeHtml(client.client_name)}</h4>
              <p class="cliente-info"><i class="fas fa-file-invoice"></i> ${client.proposals_count} Proposta(s)</p>
              <p class="cliente-info"><i class="fas fa-calendar-alt"></i> Última: ${new Date(client.last_proposal_date).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }


/**
 * Filtra a lista de clientes do especialista
 */
  filterSpecialistClientes(specialistKey, searchTerm) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const allClients = this[`allClientes${capitalizedKey}`] || [];
    
    if (!searchTerm || searchTerm.trim() === '') {
      this[`filteredClientes${capitalizedKey}`] = [...allClients];
    } else {
      const term = searchTerm.toLowerCase();
      this[`filteredClientes${capitalizedKey}`] = allClients.filter(client => 
        client.client_name.toLowerCase().includes(term)
      );
    }
    
    this.renderSpecialistClientesGrid(specialistKey);
  }

  /**
   * Abre um popup independente com os detalhes do cliente para o especialista
   */
  async showSpecialistClientPopup(clientName) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_client_details',
          client_name: clientName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const client = data.data.client;
        const proposals = data.data.proposals;
        
        // Criar o HTML do popup isolado
        const popupHtml = `
          <div id="specialistClientPopup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
            <div style="background: white; width: 90%; max-width: 900px; max-height: 90vh; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
              <div style="padding: 1.5rem; background: #2563eb; color: white; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 1.25rem;"><i class="fas fa-user-circle"></i> Detalhes do Cliente: ${this.escapeHtml(client.client_name)}</h2>
                <button onclick="document.getElementById('specialistClientPopup').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">&times;</button>
              </div>
              <div style="padding: 2rem; overflow-y: auto; flex: 1; background: #f8fafc;">
                <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border: 1px solid #e2e8f0;">
                  <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem;"><i class="fas fa-info-circle"></i> Dados Pessoais</h3>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div><strong>Nome:</strong> <span style="color: #475569;">${this.escapeHtml(client.client_name)}</span></div>
                    <div><strong>CPF:</strong> <span style="color: #475569;">${this.maskCPF(client.cpf)}</span></div>
                    <div><strong>Telefone:</strong> <span style="color: #475569;">${this.escapeHtml(client.telefone || 'Não informado')}</span></div>
                    <div><strong>Email:</strong> <span style="color: #475569;">${this.escapeHtml(client.email || 'Não informado')}</span></div>
                    ${client.data_nascimento ? `<div><strong>Nascimento:</strong> <span style="color: #475569;">${new Date(client.data_nascimento).toLocaleDateString('pt-BR')}</span></div>` : ''}
                    ${client.profissao ? `<div><strong>Profissão:</strong> <span style="color: #475569;">${this.escapeHtml(client.profissao)}</span></div>` : ''}
                    ${client.renda ? `<div><strong>Renda:</strong> <span style="color: #475569;">R$ ${parseFloat(client.renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>` : ''}
                    ${client.cep ? `<div><strong>CEP:</strong> <span style="color: #475569;">${this.escapeHtml(client.cep)}</span></div>` : ''}
                    ${client.endereco ? `<div style="grid-column: 1 / -1;"><strong>Endereço:</strong> <span style="color: #475569;">${this.escapeHtml(client.endereco)}</span></div>` : ''}
                  </div>
                </div>
                
                <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1rem;"><i class="fas fa-history"></i> Histórico de Propostas (${proposals.length})</h3>
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                      <thead>
                        <tr style="background: #f1f5f9; color: #475569;">
                          <th style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">Código</th>
                          <th style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">Veículo</th>
                          <th style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">Valor</th>
                          <th style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">Status</th>
                          <th style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${proposals.map(prop => `
                          <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 0.75rem;">${prop.id}</td>
                            <td style="padding: 0.75rem;">${this.escapeHtml(prop.veiculo || 'N/A')}</td>
                            <td style="padding: 0.75rem;">R$ ${parseFloat(prop.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td style="padding: 0.75rem;"><span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: ${this.getStatusColor(prop.status)}; color: white;">${this.getStatusText(prop.status)}</span></td>
                            <td style="padding: 0.75rem;">${new Date(prop.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div style="padding: 1rem 1.5rem; background: #f1f5f9; display: flex; justify-content: flex-end;">
                <button onclick="document.getElementById('specialistClientPopup').remove()" style="padding: 0.5rem 1.5rem; background: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Fechar</button>
              </div>
            </div>
          </div>
        `;
        
        // Remover popup anterior se existir
        const oldPopup = document.getElementById('specialistClientPopup');
        if (oldPopup) oldPopup.remove();
        
        // Adicionar ao body
        document.body.insertAdjacentHTML('beforeend', popupHtml);
      }
    } catch (error) {
      console.error('Erro ao abrir popup de cliente:', error);
      this.showNotification('Erro ao carregar detalhes do cliente', 'error');
    }
  }

  /**
   * Retorna a cor baseada no status para o popup isolado
   */

  getStatusColor(status) {
    const colors = {
      'pending': '#f59e0b',
      'analyzing': '#3b82f6',
      'approved': '#10b981',
      'rejected': '#ef4444',
      'formalizada': '#8b5cf6',
      'cancelled': '#64748b'
    };
    return colors[status] || '#64748b';
  }

  /**
   * Mostra a aba de contratos do especialista e carrega os dados
   */
  showSpecialistContratosTab(specialistKey, specialistName) {
    // Atualizar abas ativas
    document.querySelectorAll(`#${specialistKey} .tab-btn`).forEach(btn => {
      btn.classList.remove('active');
    });
    const contratoTabBtn = document.querySelector(`[data-tab="contratos-${specialistKey}"]`);
    if (contratoTabBtn) contratoTabBtn.classList.add('active');
    
    // Atualizar conteúdo ativo
    document.querySelectorAll(`#${specialistKey} .tab-content`).forEach(content => {
      content.classList.remove('active');
    });
    const contratoTabContent = document.querySelector(`[data-tab-content="contratos-${specialistKey}"]`);
    if (contratoTabContent) contratoTabContent.classList.add('active');
    
    // Carregar contratos
    this.loadSpecialistContratos(specialistKey);
  }

  /**
   * Carrega a lista de contratos
   */
  async loadSpecialistContratos(specialistKey) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const container = document.getElementById(`contratosContainer${capitalizedKey}`);
    
    try {
      // Agora buscamos os contratos filtrados diretamente pelo especialista no servidor
      const response = await fetch(`${this.apiEndpoint}?action=list_contratos&specialist=${specialistKey}`);
      const data = await response.json();
      
      if (data.success) {
        const filteredContratos = data.data.contratos || [];
        
        this[`allContratos${capitalizedKey}`] = filteredContratos;
        this[`filteredContratos${capitalizedKey}`] = [...filteredContratos];
        
        // Atualizar estatística
        const totalEl = document.getElementById(`totalContratosCount${capitalizedKey}`);
        if (totalEl) totalEl.textContent = filteredContratos.length;
        
        this.renderSpecialistContratosGrid(specialistKey);
      }
    } catch (error) {
      console.error(`Erro ao carregar contratos de ${specialistKey}:`, error);
    }
  }

  /**
   * Renderiza a grid de contratos
   */
  renderSpecialistContratosGrid(specialistKey) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const container = document.getElementById(`contratosContainer${capitalizedKey}`);
    const contratos = this[`filteredContratos${capitalizedKey}`] || [];
    
    if (!container) return;
    
    if (contratos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-contract"></i>
          <h3>Nenhum contrato encontrado</h3>
          <p>Não há contratos para seus clientes.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Arquivo</th>
              <th>Tamanho</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${contratos.map(c => `
              <tr>
                <td><strong>${this.escapeHtml(c.nome_cliente)}</strong></td>
                <td>${this.escapeHtml(c.telefone)}</td>
                <td><i class="fas fa-file-pdf" style="color: #dc2626;"></i> ${this.escapeHtml(c.arquivo_nome)}</td>
                <td>${c.tamanho_kb} KB</td>
                <td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-primary" onclick="adminDashboard.showSpecialistContratoDetails(${c.id}, '${specialistKey}')" title="Ver Detalhes">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="adminDashboard.downloadContrato(${c.id})" title="Baixar">
                      <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteSpecialistContrato(${c.id}, '${specialistKey}')" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Mostra detalhes do contrato para o especialista
   */
  async showSpecialistContratoDetails(contratoId, specialistKey) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_contrato_details',
          id: contratoId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const contrato = data.data.contrato;
        
        const modal = document.getElementById('contratoDetailsModal');
        const modalTitle = document.getElementById('contratoDetailsModalTitle');
        const modalContent = document.getElementById('contratoDetailsModalContent');
        const modalActions = document.getElementById('contratoDetailsActions');
        
        modalTitle.innerHTML = `<i class="fas fa-file-contract"></i> Contrato - ${this.escapeHtml(contrato.nome_cliente)}`;
        
        modalContent.innerHTML = `
          <div class="contrato-details-container">
            <div class="detail-section">
              <h3><i class="fas fa-info-circle"></i> Informações do Contrato</h3>
              <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Cliente:</span><span class="detail-value">${this.escapeHtml(contrato.nome_cliente)}</span></div>
                <div class="detail-item"><span class="detail-label">Telefone:</span><span class="detail-value">${this.escapeHtml(contrato.telefone)}</span></div>
                <div class="detail-item"><span class="detail-label">Arquivo:</span><span class="detail-value"><i class="fas fa-file-pdf" style="color: #dc2626;"></i> ${this.escapeHtml(contrato.arquivo_nome)}</span></div>
                <div class="detail-item"><span class="detail-label">Tamanho:</span><span class="detail-value">${contrato.tamanho_kb} KB</span></div>
                <div class="detail-item"><span class="detail-label">Data de Upload:</span><span class="detail-value">${new Date(contrato.created_at).toLocaleString('pt-BR')}</span></div>
              </div>
            </div>
          </div>
        `;
        
        modalActions.innerHTML = `
          <button class="btn btn-danger" onclick="adminDashboard.deleteSpecialistContrato(${contrato.id}, '${specialistKey}')">
            <i class="fas fa-trash"></i> Excluir Contrato
          </button>
          <button class="btn btn-success" onclick="adminDashboard.downloadContrato(${contrato.id})">
            <i class="fas fa-download"></i> Baixar Arquivo
          </button>
        `;
        
        modal.style.display = 'flex';
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do contrato:', error);
    }
  }

  /**
   * Excluir contrato (Especialista)
   */
  async deleteSpecialistContrato(contratoId, specialistKey) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_contrato',
          id: contratoId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Contrato excluído com sucesso!', 'success');
        this.closeContratoDetailsModal();
        this.loadSpecialistContratos(specialistKey);
      } else {
        this.showNotification(data.error || 'Erro ao excluir contrato', 'error');
      }
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
    }
  }

  /**
   * Filtra contratos
   */
  filterSpecialistContratos(specialistKey, searchTerm) {
    const capitalizedKey = specialistKey.charAt(0).toUpperCase() + specialistKey.slice(1);
    const all = this[`allContratos${capitalizedKey}`] || [];
    
    if (!searchTerm || searchTerm.trim() === '') {
      this[`filteredContratos${capitalizedKey}`] = [...all];
    } else {
      const term = searchTerm.toLowerCase();
      this[`filteredContratos${capitalizedKey}`] = all.filter(c => 
        c.nome_cliente.toLowerCase().includes(term)
      );
    }
    
    this.renderSpecialistContratosGrid(specialistKey);
  }

  /**
   * Abre o modal de upload de contrato para especialista
   */
  openSpecialistContratoAddModal(specialistKey) {
    const modal = document.getElementById('specialistContratoAddModal');
    const form = document.getElementById('specialistContratoAddForm');
    const keyInput = document.getElementById('specialistContratoKey');
    
    if (modal && form && keyInput) {
      form.reset();
      keyInput.value = specialistKey;
      modal.style.display = 'flex';
    }
  }

  /**
   * Fecha o modal de upload
   */
  closeSpecialistContratoAddModal() {
    const modal = document.getElementById('specialistContratoAddModal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Faz o upload do contrato
   */
  async uploadSpecialistContrato() {
    const form = document.getElementById('specialistContratoAddForm');
    const specialistKey = document.getElementById('specialistContratoKey').value;
    const fileInput = document.getElementById('specialistContratoArquivo');
    let arquivo = fileInput.files[0];
    if (!arquivo && window.__TAURI__) { arquivo = await tauriOpenFile([{ name: 'PDF', extensions: ['pdf'] }]); }
    
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    if (!arquivo) {
      this.showNotification('Selecione um arquivo PDF', 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('action', 'upload_contrato');
    formData.append('nome_cliente', document.getElementById('specialistContratoNomeCliente').value);
    formData.append('telefone', document.getElementById('specialistContratoTelefone').value);
    formData.append('specialist_key', specialistKey);
    formData.append('arquivo', arquivo);
    
    try {
      this.showNotification('Enviando contrato...', 'info');
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Contrato salvo com sucesso!', 'success');
        this.closeSpecialistContratoAddModal();
        
        // Atualizar a lista do especialista
        this.loadSpecialistContratos(specialistKey);
        
        // Atualizar também a visão geral e estatísticas globais para manter tudo sincronizado
        if (typeof this.loadContratos === 'function') this.loadContratos();
        if (typeof this.loadContratosStats === 'function') this.loadContratosStats();
        
      } else {
        this.showNotification(data.error || 'Erro ao salvar contrato', 'error');
      }
    } catch (error) {
      console.error('Erro no upload de contrato:', error);
      this.showNotification('Erro na conexão com o servidor', 'error');
    }
  }


// ============ FIM DAS FUNÇÕES PARA GESTÃO DE CLIENTES DOS ESPECIALISTAS ============




// ============ FUNÇÕES PARA GESTÃO DE NOTAS FISCAIS ============

setupNotasFiscaisModule() {
    // Configurar botão de adicionar nota fiscal
    const btnAddNotaFiscal = document.getElementById('btnAddNotaFiscal');
    if (btnAddNotaFiscal) {
        btnAddNotaFiscal.addEventListener('click', () => this.openNotaFiscalAddModal());
    }

    // Configurar pesquisa de notas fiscais
    const searchNotaFiscalInput = document.getElementById('searchNotaFiscal');
    if (searchNotaFiscalInput) {
        searchNotaFiscalInput.addEventListener('input', (e) => {
            this.filterNotasFiscais(e.target.value);
        });
    }

    // ⭐ CORREÇÃO PRINCIPAL: Adicionar event listener para o form de adicionar nota fiscal
    const notaFiscalAddForm = document.getElementById('notaFiscalAddForm');
    if (notaFiscalAddForm) {
        notaFiscalAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitNotaFiscal();
        });
    }

    // Configurar modal de adicionar
    const notaFiscalAddModal = document.getElementById('notaFiscalAddModal');
    if (notaFiscalAddModal) {
        const closeBtn = notaFiscalAddModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeNotaFiscalAddModal());
        }
    }
}

/**
 * ⭐ NOVA FUNÇÃO: Submeter formulário de nota fiscal - CORRIGIDA
 */
async submitNotaFiscal() {
    try {
        const form = document.getElementById('notaFiscalAddForm');
        const formData = new FormData(form);
        formData.append('action', 'upload_nota_fiscal');

        // Validação básica
        const nomeCliente = formData.get('nome_cliente');
        const local = formData.get('local');
        const arquivo = formData.get('arquivo');

        if (!nomeCliente || !local || !arquivo || arquivo.size === 0) {
            this.showNotification('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        // Verificar tipo de arquivo
        const fileName = arquivo.name;
        const fileExt = fileName.split('.').pop().toLowerCase();
        if (fileExt !== 'pdf' && fileExt !== 'xml') {
            this.showNotification('Apenas arquivos PDF ou XML são permitidos', 'error');
            return;
        }

        // Verificar tamanho do arquivo (50MB)
        if (arquivo.size > 50 * 1024 * 1024) {
            this.showNotification('Arquivo muito grande. Tamanho máximo: 50MB', 'error');
            return;
        }

        // Mostrar loading
        const submitBtn = form.querySelector('button[type="submit"]');
        let originalText = '<i class="fas fa-save"></i> Salvar Nota Fiscal';
        if (submitBtn) {
            originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        }

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            this.showNotification('Nota fiscal adicionada com sucesso!', 'success');
            this.closeNotaFiscalAddModal();
            await this.loadNotasFiscais();
            this.loadNotasFiscaisStats();
        } else {
            this.showNotification(data.error || 'Erro ao adicionar nota fiscal', 'error');
        }

        // Restaurar botão
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }

    } catch (error) {
        console.error('Erro ao submeter nota fiscal:', error);
        this.showNotification('Erro ao enviar nota fiscal', 'error');
        
        // Restaurar botão em caso de erro
        const form = document.getElementById('notaFiscalAddForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Nota Fiscal';
        }
    }
}


/**
 * Abrir modal para adicionar nota fiscal
 */
openNotaFiscalAddModal() {
    const modal = document.getElementById('notaFiscalAddModal');
    if (modal) {
        // Limpar formulário
        document.getElementById('notaFiscalAddForm').reset();
        modal.style.display = 'flex';
    }
}

/**
 * Fechar modal de adicionar nota fiscal
 */
closeNotaFiscalAddModal() {
    const modal = document.getElementById('notaFiscalAddModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Fazer upload de nota fiscal
 */
async uploadNotaFiscal() {
    const local = document.getElementById('nfLocal').value.trim();
    const arquivo = document.getElementById('nfArquivo').files[0];
    
    // Validar campos obrigatórios
    if (!local) {
        this.showNotification('O campo Local é obrigatório', 'error');
        return;
    }
    
    if (!arquivo) {
        this.showNotification('Por favor, selecione um arquivo', 'error');
        return;
    }
    
    // Validar tipo de arquivo
    const allowedExtensions = ['xml', 'pdf'];
    const fileExtension = arquivo.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        this.showNotification('Apenas arquivos XML e PDF são permitidos', 'error');
        return;
    }
    
    // Validar tamanho do arquivo (50MB)
    if (arquivo.size > 50 * 1024 * 1024) {
        this.showNotification('O arquivo não pode exceder 50MB', 'error');
        return;
    }
    
    // Coletar dados do formulário
    const formData = new FormData();
    formData.append('action', 'upload_nota_fiscal');
    formData.append('nome_cliente', document.getElementById('nfNomeCliente').value.trim() || '');
    formData.append('telefone', document.getElementById('nfTelefone').value.trim() || '');
    formData.append('data', document.getElementById('nfData').value.trim() || '');
    formData.append('email', document.getElementById('nfEmail').value.trim() || '');
    formData.append('cpf', document.getElementById('nfCpf').value.trim() || '');
    formData.append('local', local);
    formData.append('arquivo', arquivo);
    
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Nota fiscal adicionada com sucesso!', 'success');
            this.closeNotaFiscalAddModal();
            await this.loadNotasFiscais();
            this.loadNotasFiscaisStats();
        } else {
            this.showNotification(data.error || 'Erro ao adicionar nota fiscal', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer upload de nota fiscal:', error);
        this.showNotification('Erro ao adicionar nota fiscal', 'error');
    }
}

/**
 * Carregar estatísticas de notas fiscais
 */
async loadNotasFiscaisStats() {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_notas_fiscais_stats' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            document.getElementById('totalNotasFiscaisCount').textContent = stats.total_notas || 0;
            document.getElementById('notasFiscaisRecentesCount').textContent = stats.notas_recentes || 0;
            document.getElementById('notasXmlCount').textContent = stats.notas_xml || 0;
            document.getElementById('notasPdfCount').textContent = stats.notas_pdf || 0;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas de notas fiscais:', error);
    }
}

/**
 * Carregar notas fiscais
 */
async loadNotasFiscais() {
    const container = document.getElementById('notasFiscaisListContainer');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando notas fiscais...</div>';
    
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_notas_fiscais' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.allNotasFiscais = data.data.notas_fiscais || [];
            this.filteredNotasFiscais = [...this.allNotasFiscais];
            this.renderNotasFiscais(this.filteredNotasFiscais);
        } else {
            container.innerHTML = '<div class="error-message">Erro ao carregar notas fiscais</div>';
        }
    } catch (error) {
        console.error('Erro ao carregar notas fiscais:', error);
        container.innerHTML = '<div class="error-message">Erro ao carregar notas fiscais</div>';
    }
}

/**
 * Renderizar notas fiscais
 */
renderNotasFiscais(notasFiscais) {
    const container = document.getElementById('notasFiscaisListContainer');
    
    if (!container) return;
    
    if (!notasFiscais || notasFiscais.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="background: var(--card-bg); border-radius: 12px; padding: 4rem 2rem; text-align: center; box-shadow: var(--shadow); border: 2px dashed var(--light-border); margin-top: 2rem;">
                <i class="fas fa-file-invoice" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 1.5rem; opacity: 0.5;"></i>
                <h3 style="font-size: 1.5rem; color: var(--text-color); margin-bottom: 0.75rem; font-weight: 700;">Nenhuma Nota Fiscal Encontrada</h3>
                <p style="font-size: 1rem; color: var(--text-light); max-width: 500px; margin: 0 auto;">Clique no botão "Adicionar Nota Fiscal" para começar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="contratos-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            ${notasFiscais.map(nf => `
                <div class="contrato-card" onclick="adminDashboard.viewNotaFiscalDetails(${nf.id})" data-testid="nota-fiscal-${nf.id}" style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow); border: 2px solid transparent; transition: all 0.3s ease; cursor: pointer; position: relative; overflow: hidden;">
                    <div class="contrato-card-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--light-border);">
                        <div class="contrato-icon" style="width: 50px; height: 50px; border-radius: 12px; background: linear-gradient(135deg, ${nf.arquivo_tipo === 'xml' ? 'rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0.2) 100%' : 'rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.2) 100%'}); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: ${nf.arquivo_tipo === 'xml' ? '#9333ea' : '#dc2626'}; flex-shrink: 0; transition: transform 0.3s ease;">
                            <i class="fas ${nf.arquivo_tipo === 'xml' ? 'fa-file-code' : 'fa-file-pdf'}"></i>
                        </div>
                        <div class="contrato-info" style="flex: 1; min-width: 0;">
                            <h4 class="contrato-cliente-name" style="font-size: 1.125rem; font-weight: 700; color: var(--text-color); margin: 0 0 0.5rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${this.escapeHtml(nf.nome_cliente || 'Sem cliente')}
                            </h4>
                            <p class="contrato-meta" style="font-size: 0.875rem; color: var(--text-secondary); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                                ${this.escapeHtml(nf.local)}
                            </p>
                        </div>
                    </div>
                    <div class="contrato-card-body" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
                        <div class="contrato-file-info" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--light-bg); border-radius: 8px; font-size: 0.875rem; color: var(--text-color);">
                            <i class="fas ${nf.arquivo_tipo === 'xml' ? 'fa-file-code' : 'fa-file-pdf'}" style="font-size: 1.25rem; flex-shrink: 0; color: ${nf.arquivo_tipo === 'xml' ? '#9333ea' : '#dc2626'};"></i>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${this.escapeHtml(nf.arquivo_nome)}</span>
                        </div>
                        ${nf.cpf ? `
                        <div class="contrato-file-info" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--light-bg); border-radius: 8px; font-size: 0.875rem; color: var(--text-color);">
                            <i class="fas fa-id-card" style="font-size: 1.25rem; flex-shrink: 0; color: var(--info-color);"></i>
                            <span style="flex: 1;">CPF: ${this.escapeHtml(nf.cpf)}</span>
                        </div>
                        ` : ''}
                        <div class="contrato-file-size" style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-hdd" style="color: var(--primary-color);"></i>
                            ${(nf.arquivo_tamanho / 1024).toFixed(2)} KB
                        </div>
                    </div>
                    <div class="contrato-card-footer" style="padding-top: 0.75rem; border-top: 1px solid var(--light-border);">
                        <small style="font-size: 0.75rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-calendar" style="color: var(--primary-color);"></i>
                            ${new Date(nf.created_at).toLocaleDateString('pt-BR')} às ${new Date(nf.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Filtrar notas fiscais
 */
filterNotasFiscais(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        this.filteredNotasFiscais = [...this.allNotasFiscais];
    } else {
        const term = searchTerm.toLowerCase();
        this.filteredNotasFiscais = this.allNotasFiscais.filter(nf =>
            (nf.nome_cliente && nf.nome_cliente.toLowerCase().includes(term)) ||
            (nf.cpf && nf.cpf.includes(term)) ||
            (nf.local && nf.local.toLowerCase().includes(term)) ||
            (nf.email && nf.email.toLowerCase().includes(term))
        );
    }
    
    this.renderNotasFiscais(this.filteredNotasFiscais);
}

/**
 * Visualizar detalhes da nota fiscal
 */
async viewNotaFiscalDetails(notaFiscalId) {
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_nota_fiscal_details',
                id: notaFiscalId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const nf = data.data.nota_fiscal;
            
            const modal = document.getElementById('notaFiscalDetailsModal');
            const modalTitle = document.getElementById('notaFiscalDetailsModalTitle');
            const modalContent = document.getElementById('notaFiscalDetailsModalContent');
            const modalActions = document.getElementById('notaFiscalDetailsActions');
            
            modalTitle.innerHTML = `
                <i class="fas fa-file-invoice"></i> Nota Fiscal - ${this.escapeHtml(nf.nome_cliente || 'Sem cliente')}
            `;
            
            modalContent.innerHTML = `
                <div class="contrato-details-container" style="max-height: 70vh; overflow-y: auto;">
                    <div class="detail-section" style="background: var(--light-bg); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--light-border); margin-bottom: 1rem;">
                        <h3 style="color: var(--primary-color); margin-bottom: 1.5rem; font-size: 1.125rem; font-weight: 700; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-info-circle"></i> Informações da Nota Fiscal
                        </h3>
                        <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; margin-top: 1rem;">
                            ${nf.nome_cliente ? `
                            <div class="detail-item" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <span class="detail-label" style="font-size: 0.75rem; font-weight: 600; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px;">Cliente:</span>
                                <span class="detail-value" style="font-size: 1rem; color: var(--text-color); font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">${this.escapeHtml(nf.nome_cliente)}</span>
                            </div>
                            ` : ''}
                            ${nf.telefone ? `
                            <div class="detail-item">
                                <span class="detail-label">Telefone:</span>
                                <span class="detail-value">${this.escapeHtml(nf.telefone)}</span>
                            </div>
                            ` : ''}
                            ${nf.cpf ? `
                            <div class="detail-item">
                                <span class="detail-label">CPF:</span>
                                <span class="detail-value">${this.escapeHtml(nf.cpf)}</span>
                            </div>
                            ` : ''}
                            ${nf.email ? `
                            <div class="detail-item">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${this.escapeHtml(nf.email)}</span>
                            </div>
                            ` : ''}
                            ${nf.data ? `
                            <div class="detail-item">
                                <span class="detail-label">Data:</span>
                                <span class="detail-value">${this.escapeHtml(nf.data)}</span>
                            </div>
                            ` : ''}
                            <div class="detail-item">
                                <span class="detail-label">Local:</span>
                                <span class="detail-value"><i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i> ${this.escapeHtml(nf.local)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tipo de Arquivo:</span>
                                <span class="detail-value">
                                    <i class="fas ${nf.arquivo_tipo === 'xml' ? 'fa-file-code' : 'fa-file-pdf'}" style="color: ${nf.arquivo_tipo === 'xml' ? '#9333ea' : '#dc2626'};"></i>
                                    ${nf.arquivo_tipo.toUpperCase()}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Nome do Arquivo:</span>
                                <span class="detail-value">${this.escapeHtml(nf.arquivo_nome)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tamanho:</span>
                                <span class="detail-value">${(nf.arquivo_tamanho / 1024).toFixed(2)} KB</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Data de Upload:</span>
                                <span class="detail-value">
                                    ${new Date(nf.created_at).toLocaleDateString('pt-BR')} às 
                                    ${new Date(nf.created_at).toLocaleTimeString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            modalActions.innerHTML = `
                <button class="btn btn-danger" onclick="adminDashboard.deleteNotaFiscal(${nf.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
                <button class="btn btn-success" onclick="adminDashboard.downloadNotaFiscal(${nf.id})">
                    <i class="fas fa-download"></i> Baixar Arquivo
                </button>
            `;
            
            modal.style.display = 'flex';
        } else {
            this.showNotification(data.error || 'Erro ao buscar detalhes da nota fiscal', 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar detalhes da nota fiscal:', error);
        this.showNotification('Erro ao buscar detalhes da nota fiscal', 'error');
    }
}

/**
 * Fechar modal de detalhes da nota fiscal
 */
closeNotaFiscalDetailsModal() {
    const modal = document.getElementById('notaFiscalDetailsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Baixar nota fiscal
 */
async downloadNotaFiscal(notaFiscalId) {
    const downloadUrl = `${this.apiEndpoint}?action=download_nota_fiscal&id=${notaFiscalId}`;
    if (window.__TAURI__) {
        await this.tauriDownloadFile(downloadUrl, `nota_fiscal_${notaFiscalId}.pdf`, [{ name: 'Nota Fiscal', extensions: ['pdf', 'xml'] }]);
    } else {
        window.open(downloadUrl, '_blank');
    }
}

/**
 * Excluir nota fiscal
 */
async deleteNotaFiscal(notaFiscalId) {
    if (!confirm('Tem certeza que deseja excluir esta nota fiscal? Esta ação é irreversível.')) {
        return;
    }
    
    try {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_nota_fiscal',
                id: notaFiscalId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showNotification('Nota fiscal excluída com sucesso!', 'success');
            this.closeNotaFiscalDetailsModal();
            await this.loadNotasFiscais();
            this.loadNotasFiscaisStats();
        } else {
            this.showNotification(data.error || 'Erro ao excluir nota fiscal', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir nota fiscal:', error);
        this.showNotification('Erro ao excluir nota fiscal', 'error');
    }
}


// ============ FIM DAS FUNÇÕES PARA GESTÃO DE NOTAS FISCAIS ============

  // ============================================================
  // VERIFICAÇÃO DE ACESSO PERIÓDICA (A CADA 7 DIAS)
  // ============================================================

  /**
   * Verifica se já passaram 7 dias desde a última verificação.
   * Exibe o modal se necessário.
   */
  checkPeriodicVerification() {
    if (!this.user || !this.user.email) return;

    const storageKey  = `ccapi_verify_${this.user.email}`;
    const cooldownKey = `ccapi_verify_cooldown_${this.user.email}`;
    const sevenDays   = 7 * 24 * 60 * 60 * 1000;

    // Se há cooldown ativo, mostrar modal de espera imediatamente
    const savedCooldown = localStorage.getItem(cooldownKey);
    if (savedCooldown) {
      const unlocksAt = parseInt(savedCooldown, 10);
      if (Date.now() < unlocksAt) {
        // Fazer logout e mostrar cooldown
        if (this.adminChatPollingInterval) clearInterval(this.adminChatPollingInterval);
        localStorage.removeItem('adminUser');
        this.user = null;
        this.showLoginForm();
        setTimeout(() => this._showCooldownModal(unlocksAt, cooldownKey), 200);
        return;
      } else {
        localStorage.removeItem(cooldownKey);
      }
    }

    // Verificar se já passaram 7 dias
    let needsVerify = true;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const { verifiedAt } = JSON.parse(stored);
        needsVerify = (Date.now() - verifiedAt) >= sevenDays;
      }
    } catch {
      needsVerify = true;
    }

    if (needsVerify) {
      this._showVerificationModal();
    }
  }

  /** Salva o timestamp da verificação bem-sucedida */
  _markVerificationDone() {
    if (!this.user || !this.user.email) return;
    localStorage.setItem(
      `ccapi_verify_${this.user.email}`,
      JSON.stringify({ verifiedAt: Date.now() })
    );
  }

  /** Obtém IP público do usuário */
  async _getUserIP() {
    try {
      const res  = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'Desconhecido';
    } catch {
      return 'Desconhecido';
    }
  }

  /** Detecta SO e navegador pelo User-Agent */
  _getDeviceName() {
    const ua = navigator.userAgent;

    let os = 'Sistema Desconhecido';
    if (/Windows NT 10|Windows NT 11/.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6/.test(ua))           os = 'Windows 7/8';
    else if (/Mac OS X/.test(ua))               os = 'macOS';
    else if (/Android/.test(ua))                os = 'Android';
    else if (/iPhone|iPad/.test(ua))            os = 'iOS';
    else if (/Linux/.test(ua))                  os = 'Linux';

    let browser = 'Navegador Desconhecido';
    if (/Edg\//.test(ua))        browser = 'Microsoft Edge';
    else if (/Chrome\//.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\//.test(ua))browser = 'Mozilla Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    return `${browser} — ${os}`;
  }

  /**
   * Exibe o modal de verificação cobrindo toda a tela.
   * O usuário não consegue fechar sem inserir a senha correta.
   */
  _showVerificationModal() {
    if (document.getElementById('ccapi-verify-overlay')) return;

    const CORRECT     = 'Ccapi@1281';
    const MAX         = 5;
    const ALERT_ON    = 2;
    const COOLDOWN_MS = 30 * 60 * 1000;
    const cooldownKey = `ccapi_verify_cooldown_${this.user?.email}`;

    // Verificar se ainda está em cooldown
    const savedCooldown = localStorage.getItem(cooldownKey);
    if (savedCooldown) {
      const unlocksAt = parseInt(savedCooldown, 10);
      if (Date.now() < unlocksAt) {
        this._showCooldownModal(unlocksAt, cooldownKey);
        return;
      } else {
        localStorage.removeItem(cooldownKey);
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'ccapi-verify-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.82);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif';

    // Monta os círculos de tentativas (5 verdes)
    const buildDots = (wrong) => {
      let html = '';
      for (let i = 0; i < MAX; i++) {
        const color = i < (MAX - wrong) ? '#22c55e' : '#fca5a5';
        const title = i < (MAX - wrong) ? 'Tentativa disponível' : 'Tentativa usada';
        html += `<div title="${title}" style="width:14px;height:14px;border-radius:50%;background:${color};transition:background .35s;flex-shrink:0;"></div>`;
      }
      return html;
    };

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:2.5rem 2rem;max-width:420px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,.28);text-align:center;">

        <div style="width:68px;height:68px;background:#dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.3rem;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <h2 style="margin:0 0 .4rem;color:#0f172a;font-size:1.3rem;">Verificação de Acesso</h2>
        <p style="color:#64748b;margin:0 0 .25rem;font-size:.9rem;">Olá, <strong id="cvUsername"></strong></p>
        <p style="color:#94a3b8;margin:0 0 1.5rem;font-size:.8rem;">Por segurança, esta verificação ocorre a cada 7 dias.</p>

        <input
          type="password"
          id="cvInput"
          placeholder="Senha de verificação"
          autocomplete="new-password"
          style="width:100%;padding:.78rem 1rem;border:2px solid #e2e8f0;border-radius:9px;font-size:1rem;box-sizing:border-box;margin-bottom:.5rem;outline:none;transition:border-color .2s;"
        >

        <p id="cvMsg" style="min-height:1.1rem;font-size:.82rem;color:#dc2626;margin:0 0 .8rem;font-weight:500;"></p>

        <button id="cvBtn" style="width:100%;padding:.88rem;background:#2563eb;color:#fff;border:none;border-radius:9px;font-size:1rem;font-weight:700;cursor:pointer;transition:background .2s;">
          Confirmar
        </button>

        <div style="margin-top:1.2rem;">
          <p style="font-size:.73rem;color:#94a3b8;margin:0 0 .45rem;letter-spacing:.02em;">TENTATIVAS RESTANTES</p>
          <div id="cvDots" style="display:flex;gap:7px;justify-content:center;">${buildDots(0)}</div>
          <p id="cvAttemptsText" style="font-size:.78rem;color:#64748b;margin:.45rem 0 0;font-weight:500;">5 de 5 tentativas disponíveis</p>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    // ── IMPORTANTE: usar nome, não email — evita vazar no campo de busca ──
    const userName = (this.user.name && this.user.name.trim()) ? this.user.name.trim() : 'Usuário';
    document.getElementById('cvUsername').textContent = userName;

    const input        = overlay.querySelector('#cvInput');
    const btn          = overlay.querySelector('#cvBtn');
    const msgEl        = overlay.querySelector('#cvMsg');
    const dotsEl       = overlay.querySelector('#cvDots');
    const attemptsText = overlay.querySelector('#cvAttemptsText');

    const updateDots = (wrong) => {
      dotsEl.innerHTML = buildDots(wrong);
      const remaining = MAX - wrong;
      attemptsText.textContent = `${remaining} de ${MAX} tentativa${remaining !== 1 ? 's' : ''} disponíve${remaining !== 1 ? 'is' : 'l'}`;
      attemptsText.style.color = remaining <= 2 ? '#dc2626' : '#64748b';
    };

    let attempts  = 0;
    let alertSent = false;
    let userIP    = '';

    this._getUserIP().then(ip => { userIP = ip; });

    // ── Focar no campo SEM repassar eventos ao documento ──
    // Usar requestAnimationFrame após um frame garante que o
    // evento keydown que abriu o modal já foi processado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { input.focus(); });
    });

    input.addEventListener('focus', () => { input.style.borderColor = '#2563eb'; });
    input.addEventListener('blur',  () => { input.style.borderColor = '#e2e8f0'; });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // impede que a tecla vaze para inputs externos
      if (e.key === 'Enter') btn.click();
    });
    btn.addEventListener('mouseenter', () => { btn.style.background = '#1d4ed8'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#2563eb'; });

    btn.addEventListener('click', async () => {
      const value = input.value.trim();
      if (!value) {
        msgEl.textContent = 'Por favor, insira a senha.';
        input.focus();
        return;
      }

      // ✅ CORRETO
      if (value === CORRECT) {
        overlay.remove();
        this._markVerificationDone();
        this.showNotification('Verificação concluída!', 'success');
        return;
      }

      // ❌ ERRADO
      attempts++;
      input.value = '';
      input.style.borderColor = '#dc2626';
      setTimeout(() => { input.style.borderColor = '#e2e8f0'; }, 900);
      updateDots(attempts);

      // Enviar alerta de email na 2ª tentativa errada
      if (attempts >= ALERT_ON && !alertSent) {
        alertSent = true;
        if (!userIP) userIP = await this._getUserIP();
        fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action:      'send_security_alert',
            user_name:   this.user.name  || 'Desconhecido',
            user_email:  this.user.email || '',
            user_ip:     userIP,
            device_name: this._getDeviceName(),
            attempts:    attempts
          })
        }).catch(err => console.error('Erro ao enviar alerta de segurança:', err));
      }

      // 🔒 ESGOTOU AS 5 TENTATIVAS
      if (attempts >= MAX) {
        btn.disabled         = true;
        input.disabled       = true;
        btn.style.background = '#dc2626';
        btn.textContent      = 'Bloqueado';
        msgEl.textContent    = '';

        // Salvar cooldown de 30 min
        const unlocksAt = Date.now() + COOLDOWN_MS;
        localStorage.setItem(cooldownKey, String(unlocksAt));

        // Bloquear IP no servidor
        if (!userIP) userIP = await this._getUserIP();
        fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'block_ip', ip: userIP, email: this.user.email || '' })
        }).catch(() => {});

        // Substituir pelo modal de cooldown após pequena pausa
        setTimeout(() => {
          overlay.remove();
          if (this.adminChatPollingInterval) clearInterval(this.adminChatPollingInterval);
          localStorage.removeItem('adminUser');
          this.user = null;
          this.showLoginForm();
          this._showCooldownModal(unlocksAt, cooldownKey);
        }, 1000);

        return;
      }

      const remaining = MAX - attempts;
      msgEl.textContent = `Senha incorreta.`;
      input.focus();
    });
  }

  /**
   * Modal de cooldown — exibe contador regressivo de 30 min
   * e automaticamente libera novas tentativas ao zerar.
   */
  _showCooldownModal(unlocksAt, cooldownKey) {
    // Remover overlay anterior se existir
    document.getElementById('ccapi-verify-overlay')?.remove();
    document.getElementById('ccapi-cooldown-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ccapi-cooldown-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.88);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:2.5rem 2rem;max-width:400px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,.3);text-align:center;">

        <div style="width:68px;height:68px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.3rem;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>

        <h2 style="margin:0 0 .5rem;color:#0f172a;font-size:1.25rem;">Acesso Temporariamente Bloqueado</h2>
        <p style="color:#64748b;margin:0 0 1.8rem;font-size:.88rem;line-height:1.5;">
          Você esgotou as tentativas de verificação.<br>
          Aguarde o tempo abaixo para tentar novamente.
        </p>

        <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:1.2rem;margin-bottom:1.5rem;">
          <p style="font-size:.75rem;color:#dc2626;font-weight:600;margin:0 0 .3rem;letter-spacing:.05em;text-transform:uppercase;">Libera em</p>
          <p id="cvCountdown" style="font-size:2.4rem;font-weight:800;color:#dc2626;margin:0;letter-spacing:.04em;font-variant-numeric:tabular-nums;">--:--</p>
        </div>

        <p style="font-size:.78rem;color:#94a3b8;margin:0;">
          Para liberar o acesso antes do tempo, entre em contato com o administrador do sistema.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const countdownEl = overlay.querySelector('#cvCountdown');

    const tick = () => {
      const remaining = unlocksAt - Date.now();
      if (remaining <= 0) {
        // Cooldown terminou — remover overlay e mostrar modal de verificação de novo
        localStorage.removeItem(cooldownKey);
        overlay.remove();
        // Só reabrir se o usuário ainda não estiver logado (pode ter feito login de novo)
        if (window.adminDashboard && window.adminDashboard.user) {
          window.adminDashboard._showVerificationModal();
        }
        return;
      }

      const totalSec = Math.ceil(remaining / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      countdownEl.textContent = `${min}:${sec}`;

      setTimeout(tick, 500);
    };

    tick();
  }


  // ═══════════════════════════════════════════════════════════════
  //  HELPERS DE ESPECIALISTAS (FIXOS + DINÂMICOS)
  // ═══════════════════════════════════════════════════════════════

  /** Todos os especialistas: fixos + dinâmicos carregados */
  _getAllSpecialists() {
    const fixed = [
      { key: 'fabricio',  name: 'Fabrício'  },
      { key: 'neto',      name: 'Neto'       },
      { key: 'wandreyna', name: 'Wandreyna'  },
      { key: 'eder',      name: 'Éder'       },
      { key: 'suzana',    name: 'Suzana'     },
    ];
    const dynamic = (this._dynamicSpecialists || []).map(s => ({ key: s.key_name, name: s.name }));
    return [...fixed, ...dynamic];
  }

  /** Normaliza string para comparação (sem acento, sem espaço, minúsculo) */
  _norm(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s/g, '');
  }

  /** Nome de exibição a partir de chave ou nome */
  _getSpecialistDisplayName(keyOrName) {
    const n = this._norm(keyOrName);
    const found = this._getAllSpecialists().find(s => this._norm(s.key) === n || this._norm(s.name) === n);
    return found ? found.name : (keyOrName || '');
  }

  /** Gera <option> para o select de edição — value = nome de exibição */
  _getSpecialistOptions(currentValue) {
    const currNorm = this._norm(currentValue);
    return this._getAllSpecialists().map(s => {
      const sel = currNorm && (this._norm(s.key) === currNorm || this._norm(s.name) === currNorm) ? ' selected' : '';
      return `<option value="${s.name}"${sel}>${s.name}</option>`;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  //  GESTÃO DE ESPECIALISTAS DINÂMICOS
  // ═══════════════════════════════════════════════════════════════

  /** Busca especialistas salvos no banco e aplica à UI */
  async loadDynamicSpecialists() {
    try {
      const res  = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_specialists' })
      });
      const data = await res.json();
      if (data.success) {
        this._dynamicSpecialists = data.data.specialists || [];
        this._dynamicSpecialists.forEach(s => this._applySpecialistToUI(s.key_name, s.name));
        this._refreshDynamicSelects();
      }
    } catch (e) {
      console.warn('loadDynamicSpecialists error:', e);
    }
  }

  /** Atualiza todos os <select> de especialista com os dinâmicos */
  _refreshDynamicSelects() {
    const dynamics = this._dynamicSpecialists || [];

    // newSpecialist: rebuild completo (value = nome de exibição)
    const newSel = document.getElementById('newSpecialist');
    if (newSel) {
      newSel.innerHTML = `<option value="">Selecione...</option>
        <option value="Fabrício">Fabrício</option>
        <option value="Neto">Neto</option>
        <option value="Wandreyna">Wandreyna</option>
        <option value="Éder">Éder</option>
        <option value="Suzana">Suzana</option>
        ${dynamics.map(s => `<option value="${s.name}" data-dynamic="1">${s.name}</option>`).join('')}`;
    }

    // searchSpecialist, reportSpecialist
    ['searchSpecialist', 'reportSpecialist'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.querySelectorAll('[data-dynamic]').forEach(o => o.remove());
      dynamics.forEach(s => {
        const o = document.createElement('option');
        o.value = s.name; o.textContent = s.name; o.dataset.dynamic = '1';
        sel.appendChild(o);
      });
    });

    // userType no cadastro
    const utSel = document.getElementById('userType');
    if (utSel) {
      utSel.querySelectorAll('[data-dynamic]').forEach(o => o.remove());
      dynamics.forEach(s => {
        const o = document.createElement('option');
        o.value = s.key_name; o.textContent = `Especialista - ${s.name}`; o.dataset.dynamic = '1';
        utSel.appendChild(o);
      });
    }
  }

  /** Cria aba no sidebar e seção HTML para um especialista dinâmico */
  _applySpecialistToUI(key, name) {
    // Sidebar
    if (!document.querySelector(`.nav-item[data-section="${key}"]`)) {
      const anchor = document.getElementById('dynamicSpecialistsAnchor');
      const navMenu = document.querySelector('.nav-menu') || document.querySelector('nav ul');
      if (!navMenu) return;

      const makeItem = (extraClass, label) => {
        const li = document.createElement('li');
        li.className = `nav-item ${extraClass}`;
        li.dataset.section = key;
        li.innerHTML = `<i class="fas fa-user-tie"></i> ${label}`;
        li.style.display = 'none';
        li.addEventListener('click', () => {
          document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
          li.classList.add('active');
          this.showSection(key);
        });
        return li;
      };

      const specLi  = makeItem(`specialist-only specialist-${key}`, 'Minhas Propostas');
      const adminLi = makeItem('admin-only', name);

      if (anchor) {
        navMenu.insertBefore(adminLi, anchor);
        navMenu.insertBefore(specLi, anchor);
      } else {
        navMenu.appendChild(specLi);
        navMenu.appendChild(adminLi);
      }
    }

    // Seção HTML
    if (!document.getElementById(key)) {
      const capKey  = key.charAt(0).toUpperCase() + key.slice(1);
      const months  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                       'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                       .map((m,i) => `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`).join('');
      const section = document.createElement('section');
      section.className = 'admin-section';
      section.id = key;
      section.style.display = 'none';
      section.innerHTML = `
        <div class="section-header">
          <h1><i class="fas fa-user-tie"></i> ${name}</h1>
          <div class="section-actions">
            <button class="btn btn-primary" id="addProposalBtn${capKey}">
              <i class="fas fa-plus"></i> Nova Proposta
            </button>
          </div>
        </div>
        <div class="search-container" style="margin-bottom:1.5rem;">
          <div class="search-box">
            <div class="search-icon"><i class="fas fa-search"></i></div>
            <input type="text" id="searchName${capKey}" class="search-input" placeholder="Buscar por nome do cliente...">
          </div>
          <div class="search-filters">
            <div class="filter-group"><label>Mês</label>
              <select id="searchMonth${capKey}" class="filter-select"><option value="">Todos</option>${months}</select>
            </div>
            <div class="filter-group"><label>Ano</label>
              <select id="searchYear${capKey}" class="filter-select"><option value="">Todos</option></select>
            </div>
            <div class="filter-group"><label>Banco</label>
              <select id="searchBank${capKey}" class="filter-select">
                <option value="">Todos</option><option>Santander</option><option>BV</option>
                <option>OMNI</option><option>C6</option><option>ITAÚ</option><option>PAN</option>
              </select>
            </div>
            <button class="btn btn-secondary btn-sm" id="clearFilters${capKey}">
              <i class="fas fa-times"></i> Limpar
            </button>
          </div>
        </div>
        <div class="specialist-proposals" data-specialist="${key}">
          <p class="no-data">Carregando propostas...</p>
        </div>`;

      // Insere antes da seção "chats" se existir, senão no fim do main
      const chats = document.getElementById('chats');
      const main  = document.querySelector('main') || document.body;
      if (chats) chats.parentNode.insertBefore(section, chats);
      else main.appendChild(section);

      // Wire buttons
      document.getElementById(`addProposalBtn${capKey}`)
        ?.addEventListener('click', () => this.openAddProposalModal());
      document.getElementById(`searchName${capKey}`)
        ?.addEventListener('input',  () => this.filterSpecialistProposals(key));
      document.getElementById(`searchMonth${capKey}`)
        ?.addEventListener('change', () => this.filterSpecialistProposals(key));
      document.getElementById(`searchYear${capKey}`)
        ?.addEventListener('change', () => this.filterSpecialistProposals(key));
      document.getElementById(`searchBank${capKey}`)
        ?.addEventListener('change', () => this.filterSpecialistProposals(key));
      document.getElementById(`clearFilters${capKey}`)
        ?.addEventListener('click',  () => this.clearSpecialistFilters(key));
    }
  }

  // ─── Modal: Adicionar Especialista ────────────────────────────────
  openAddSpecialistModal() {
    document.getElementById('newSpecialistName').value = '';
    document.getElementById('addSpecialistError').textContent = '';
    document.getElementById('addSpecialistModal').style.display = 'flex';
    setTimeout(() => document.getElementById('newSpecialistName').focus(), 100);
  }
  closeAddSpecialistModal() {
    document.getElementById('addSpecialistModal').style.display = 'none';
  }
  async confirmAddSpecialist() {
    const nameEl = document.getElementById('newSpecialistName');
    const errEl  = document.getElementById('addSpecialistError');
    const btn    = document.getElementById('confirmAddSpecialistBtn');
    const name   = nameEl.value.trim();
    errEl.textContent = '';
    if (!name) { errEl.textContent = 'Informe o nome.'; return; }
    const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
    if (!key) { errEl.textContent = 'Nome inválido.'; return; }
    btn.disabled = true;
    try {
      const res  = await fetch(this.apiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_specialist', name, key })
      });
      const data = await res.json();
      if (!data.success) { errEl.textContent = data.error || 'Erro.'; return; }
      this._dynamicSpecialists = this._dynamicSpecialists || [];
      this._dynamicSpecialists.push({ key_name: key, name });
      this._applySpecialistToUI(key, name);
      this._refreshDynamicSelects();
      this.closeAddSpecialistModal();
      this.showNotification(`Especialista "${name}" adicionado!`, 'success');
    } catch (e) { errEl.textContent = 'Erro de conexão.'; }
    finally { btn.disabled = false; }
  }

  // ─── Modal: Excluir Especialista ──────────────────────────────────
  openDeleteSpecialistModal() {
    const sel   = document.getElementById('deleteSpecialistSelect');
    const errEl = document.getElementById('deleteSpecialistError');
    errEl.textContent = '';
    sel.innerHTML = '<option value="">Selecione...</option>';
    (this._dynamicSpecialists || []).forEach(s => {
      const o = document.createElement('option');
      o.value = s.key_name; o.textContent = s.name;
      sel.appendChild(o);
    });
    if (!(this._dynamicSpecialists || []).length) {
      errEl.textContent = 'Nenhum especialista dinâmico cadastrado.';
    }
    document.getElementById('deleteSpecialistModal').style.display = 'flex';
  }
  closeDeleteSpecialistModal() {
    document.getElementById('deleteSpecialistModal').style.display = 'none';
  }
  async confirmDeleteSpecialist() {
    const sel   = document.getElementById('deleteSpecialistSelect');
    const errEl = document.getElementById('deleteSpecialistError');
    const btn   = document.getElementById('confirmDeleteSpecialistBtn');
    const key   = sel.value;
    errEl.textContent = '';
    if (!key) { errEl.textContent = 'Selecione um especialista.'; return; }
    btn.disabled = true;
    try {
      const res  = await fetch(this.apiEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_specialist', key })
      });
      const data = await res.json();
      if (!data.success) { errEl.textContent = data.error || 'Erro.'; return; }
      this._dynamicSpecialists = (this._dynamicSpecialists || []).filter(s => s.key_name !== key);
      document.getElementById(key)?.remove();
      document.querySelectorAll(`.nav-item[data-section="${key}"]`).forEach(el => el.remove());
      this._refreshDynamicSelects();
      this.closeDeleteSpecialistModal();
      this.showNotification('Especialista excluído com sucesso!', 'success');
    } catch (e) { errEl.textContent = 'Erro de conexão.'; }
    finally { btn.disabled = false; }
  }


  // ══════════════════════════════════════════════════════════════════════
  //  FOTO DE PERFIL
  //  Chave de storage: ccapi_avatar_<email> — persiste entre logins pois
  //  usa o email que fica salvo no adminUser do localStorage.
  // ══════════════════════════════════════════════════════════════════════

  /** Chave única por usuário — usa o email salvo no adminUser do localStorage.
   *  Não depende de this.user para funcionar — sobrevive a logout/login. */
  _ppKey() {
    // Prioridade: this.user.email → adminUser no localStorage → 'guest'
    // adminUser persiste no localStorage mesmo após this.user = null,
    // então a chave sempre resolve para o email correto
    let email = this.user?.email;
    if (!email) {
      try {
        const stored = localStorage.getItem('adminUser');
        email = stored ? JSON.parse(stored)?.email : null;
      } catch(e) {}
    }
    if (!email) email = 'guest';
    return 'ccapi_avatar_' + email.toLowerCase().replace(/[^a-z0-9@._-]/gi, '_');
  }

  /** Aplica foto salva ao avatar do sidebar — chama após login e no checkLoginStatus */
  loadProfilePhoto() {
    try {
      const key  = this._ppKey();
      const data = localStorage.getItem(key);
      console.log('[Avatar] Carregando foto. Chave:', key, '| Encontrada:', !!data);
      if (data) {
        this._setAvatarSrc(data);
      } else {
        this._clearAvatar();
      }
    } catch(e) { console.warn('[Avatar] Erro ao carregar foto:', e); }
  }

  _setAvatarSrc(base64) {
    const img  = document.getElementById('userAvatarImg');
    const icon = document.getElementById('userAvatarIcon');
    if (img)  { img.src = base64; img.style.display = 'block'; }
    if (icon) { icon.style.display = 'none'; }
  }

  _clearAvatar() {
    const img  = document.getElementById('userAvatarImg');
    const icon = document.getElementById('userAvatarIcon');
    if (img)  { img.src = ''; img.style.display = 'none'; }
    if (icon) { icon.style.display = ''; }
  }

  openProfilePhotoModal() {
    // Reset estado
    this._ppFile = null; this._ppDataUrl = null;
    this._ppX = 0; this._ppY = 0; this._ppScale = 1; this._ppDragging = false;

    // UI: volta para step 1
    const s1 = document.getElementById('ppStep1');
    const s2 = document.getElementById('ppStep2');
    const sb = document.getElementById('ppSaveBtn');
    if (s1) s1.style.display = '';
    if (s2) s2.style.display = 'none';
    if (sb) sb.style.display = 'none';
    const sl = document.getElementById('ppZoomSlider');
    if (sl) sl.value = 100;

    // Mostra foto atual
    const stored  = localStorage.getItem(this._ppKey());
    const preview = document.getElementById('ppCurrentPreview');
    const remBtn  = document.getElementById('ppRemoveBtn');
    if (preview) {
      preview.innerHTML = stored
        ? `<img src="${stored}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : '<i class="fas fa-user" style="font-size:2rem;color:#94a3b8;"></i>';
    }
    if (remBtn) remBtn.style.display = stored ? '' : 'none';

    const modal = document.getElementById('profilePhotoModal');
    if (modal) { modal.style.display = 'flex'; }
  }

  closeProfilePhotoModal() {
    const modal = document.getElementById('profilePhotoModal');
    if (modal) modal.style.display = 'none';
    this._ppCleanupListeners();
  }

  /** Abre gerenciador de arquivos: Tauri nativo ou <input> no browser */
  async pickProfilePhoto() {
    if (window.__TAURI__) {
      try {
        const { open } = window.__TAURI__.dialog;
        const path = await open({
          multiple: false,
          filters: [{ name: 'Imagens', extensions: ['jpg','jpeg','png','webp'] }]
        });
        if (!path) return;
        const { readBinaryFile } = window.__TAURI__.fs;
        const bytes = await readBinaryFile(path);
        const ext   = path.split('.').pop().toLowerCase();
        const mime  = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const url   = await this._blobToUrl(new Blob([bytes], { type: mime }));
        this._ppLoadImage(url);
        return;
      } catch(e) { console.warn('Tauri open falhou, usando fallback:', e); }
    }
    // Fallback browser
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) this._ppLoadImage(await this._blobToUrl(file));
    };
    input.click();
  }

  async handleProfilePhotoDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('ppDropZone');
    if (dz) dz.style.borderColor = '#cbd5e1';
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      this.showNotification('Arquivo inválido. Use JPG, PNG ou WEBP.', 'error');
      return;
    }
    this._ppLoadImage(await this._blobToUrl(file));
  }

  _blobToUrl(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  _ppLoadImage(dataUrl) {
    this._ppDataUrl = dataUrl;
    const img = document.getElementById('ppCropImg');
    img.onload = () => {
      this._ppImgW = img.naturalWidth;
      this._ppImgH = img.naturalHeight;
      const wrap  = document.getElementById('ppCropWrap');
      const wW    = wrap.clientWidth;
      const wH    = wrap.clientHeight;
      // Zoom inicial: garante que cobre o círculo de 180px
      const fit   = Math.max(180 / img.naturalWidth, 180 / img.naturalHeight);
      const init  = Math.max(fit, Math.min(wW / img.naturalWidth, wH / img.naturalHeight)) * 1.05;
      this._ppScale = init;
      document.getElementById('ppZoomSlider').value = Math.round(init * 100);
      // Centraliza
      this._ppX = (wW - img.naturalWidth  * init) / 2;
      this._ppY = (wH - img.naturalHeight * init) / 2;
      this._ppApplyTransform();
      // Vai para step 2
      document.getElementById('ppStep1').style.display = 'none';
      document.getElementById('ppStep2').style.display = '';
      document.getElementById('ppSaveBtn').style.display = '';
      this._ppSetupDrag();
    };
    img.src = dataUrl;
  }

  _ppApplyTransform() {
    const img  = document.getElementById('ppCropImg');
    const wrap = document.getElementById('ppCropWrap');
    const wW   = wrap.clientWidth;
    const wH   = wrap.clientHeight;
    const iW   = this._ppImgW * this._ppScale;
    const iH   = this._ppImgH * this._ppScale;
    const cx   = (wW - 180) / 2;
    const cy   = (wH - 180) / 2;
    // Impede que a imagem saia do círculo
    this._ppX  = Math.min(cx, Math.max(cx + 180 - iW, this._ppX));
    this._ppY  = Math.min(cy, Math.max(cy + 180 - iH, this._ppY));
    img.style.width  = this._ppImgW + 'px';
    img.style.height = this._ppImgH + 'px';
    img.style.transform = `translate(${this._ppX}px,${this._ppY}px) scale(${this._ppScale})`;
    img.style.transformOrigin = 'top left';
  }

  _ppZoom(val) {
    const wrap = document.getElementById('ppCropWrap');
    const old  = this._ppScale;
    this._ppScale = val / 100;
    const cx   = wrap.clientWidth  / 2;
    const cy   = wrap.clientHeight / 2;
    this._ppX  = cx - (cx - this._ppX) * (this._ppScale / old);
    this._ppY  = cy - (cy - this._ppY) * (this._ppScale / old);
    this._ppApplyTransform();
  }

  _ppReset() {
    if (this._ppDataUrl) this._ppLoadImage(this._ppDataUrl);
  }

  _ppSetupDrag() {
    this._ppCleanupListeners();
    const wrap = document.getElementById('ppCropWrap');

    const down = (e) => {
      this._ppDragging = true;
      this._ppLX = e.clientX ?? e.touches?.[0]?.clientX;
      this._ppLY = e.clientY ?? e.touches?.[0]?.clientY;
      wrap.classList.add('grabbing');
    };
    const move = (e) => {
      if (!this._ppDragging) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX;
      const y = e.clientY ?? e.touches?.[0]?.clientY;
      this._ppX += x - this._ppLX;
      this._ppY += y - this._ppLY;
      this._ppLX = x; this._ppLY = y;
      this._ppApplyTransform();
    };
    const up = () => { this._ppDragging = false; wrap.classList.remove('grabbing'); };
    const wheel = (e) => {
      e.preventDefault();
      const sl  = document.getElementById('ppZoomSlider');
      const val = Math.max(50, Math.min(300, +sl.value + (e.deltaY > 0 ? -5 : 5)));
      sl.value  = val;
      this._ppZoom(val);
    };

    wrap.addEventListener('mousedown',  down);
    wrap.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('mousemove',  move);
    document.addEventListener('touchmove',  move, { passive: true });
    document.addEventListener('mouseup',    up);
    document.addEventListener('touchend',   up);
    wrap.addEventListener('wheel', wheel, { passive: false });
    this._ppEv = { wrap, down, move, up, wheel };
  }

  _ppCleanupListeners() {
    if (!this._ppEv) return;
    const { wrap, down, move, up, wheel } = this._ppEv;
    wrap?.removeEventListener('mousedown',  down);
    wrap?.removeEventListener('touchstart', down);
    document.removeEventListener('mousemove',  move);
    document.removeEventListener('touchmove',  move);
    document.removeEventListener('mouseup',    up);
    document.removeEventListener('touchend',   up);
    wrap?.removeEventListener('wheel', wheel);
    this._ppEv = null;
  }

  /** Renderiza o círculo de 180px num canvas 300×300 e salva no localStorage */
  saveProfilePhoto() {
    const wrap  = document.getElementById('ppCropWrap');
    const wW    = wrap.clientWidth;
    const wH    = wrap.clientHeight;
    const cx    = (wW - 180) / 2;
    const cy    = (wH - 180) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 300;
    const ctx    = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(150, 150, 150, 0, Math.PI * 2);
    ctx.clip();

    const img   = new Image();
    img.src     = this._ppDataUrl;
    const ratio = 300 / 180;
    ctx.drawImage(
      img,
      (this._ppX - cx) * ratio,
      (this._ppY - cy) * ratio,
      this._ppImgW * this._ppScale * ratio,
      this._ppImgH * this._ppScale * ratio
    );

    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    const key = this._ppKey();
    console.log('[Avatar] Salvando foto. Chave:', key);
    try {
      localStorage.setItem(key, base64);
    } catch(e) {
      this.showNotification('Não foi possível salvar a foto (localStorage cheio?)', 'error');
      return;
    }
    this._setAvatarSrc(base64);
    this.closeProfilePhotoModal();
    this.showNotification('Foto de perfil atualizada!', 'success');
  }

  removeProfilePhoto() {
    try { localStorage.removeItem(this._ppKey()); } catch(e) {}
    this._clearAvatar();
    this.closeProfilePhotoModal();
    this.showNotification('Foto de perfil removida.', 'success');
  }



  // ═══════════════════════════════════════════════════════════════════
  //  CALCULAR EXTRATO BANCÁRIO
  //  Suporta: PDF digital (PDF.js) + Imagens escaneadas (Tesseract OCR)
  //  Múltiplos arquivos — tudo 100% no browser/Tauri, sem servidor
  // ═══════════════════════════════════════════════════════════════════

  openExtratoModal() {
    this._extratoArquivos = [];
    this._extratoGoToStep(1);
    this._extratoRenderFileList();
    const m = document.getElementById('extratoModal');
    if (m) m.style.display = 'flex';
  }

  closeExtratoModal() {
    const m = document.getElementById('extratoModal');
    if (m) m.style.display = 'none';
    this._extratoArquivos = [];
  }

  _extratoGoToStep(n) {
    [1,2,3].forEach(i => {
      const el = document.getElementById('extratoStep' + i);
      if (el) el.style.display = (i === n) ? '' : 'none';
    });
    const back    = document.getElementById('extratoBackBtn');
    const confirm = document.getElementById('extratoConfirmBtn');
    if (back)    back.style.display    = n === 3 ? '' : 'none';
    if (confirm) confirm.style.display = n === 3 ? 'none' : '';
  }

  extratoGoBack() {
    this._extratoArquivos = [];
    this._extratoRenderFileList();
    this._extratoGoToStep(1);
  }

  // ── Seleção de arquivos — Tauri ou browser ─────────────────────────────

  async pickExtratoPDF() {
    const files = await this._extratoPickFiles(
      [{ name: 'PDF', extensions: ['pdf'] }],
      'application/pdf', false
    );
    files.forEach(f => this._extratoAddFile(f));
  }

  async pickExtratoImagens() {
    const files = await this._extratoPickFiles(
      [{ name: 'Imagens', extensions: ['jpg','jpeg','png','webp','bmp','tiff','tif'] }],
      'image/*', true
    );
    files.forEach(f => this._extratoAddFile(f));
  }

  async _extratoPickFiles(tauriFilters, browserAccept, multiple) {
    // ── Tauri: gerenciador de arquivos nativo ──────────────────────────
    if (window.__TAURI__) {
      try {
        const { open } = window.__TAURI__.dialog;
        const selected = await open({ multiple, filters: tauriFilters });
        if (!selected) return [];
        const paths = Array.isArray(selected) ? selected : [selected];
        const { readBinaryFile } = window.__TAURI__.fs;
        const result = [];
        for (const p of paths) {
          const bytes = await readBinaryFile(p);
          const name  = p.replace(/\\/g, '/').split('/').pop();
          const ext   = name.split('.').pop().toLowerCase();
          const mime  = ext === 'pdf' ? 'application/pdf'
                      : ext === 'png' ? 'image/png'
                      : ext === 'webp'? 'image/webp'
                      : 'image/jpeg';
          result.push(new File([bytes], name, { type: mime }));
        }
        return result;
      } catch(e) {
        console.warn('[Extrato Tauri] Falhou, usando fallback:', e);
      }
    }
    // ── Fallback browser ───────────────────────────────────────────────
    return new Promise(resolve => {
      const input    = document.createElement('input');
      input.type     = 'file';
      input.accept   = browserAccept;
      input.multiple = multiple;
      input.onchange = e => resolve(Array.from(e.target.files || []));
      input.click();
    });
  }

  handleExtratoDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('extratoDropZone');
    if (dz) { dz.style.borderColor = '#cbd5e1'; dz.style.background = '#f8fafc'; }
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;
    const validos = files.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['pdf','jpg','jpeg','png','webp','bmp','tiff','tif'].includes(ext);
    });
    if (validos.length < files.length)
      this.showNotification('Alguns arquivos ignorados — use PDF ou imagens.', 'warning');
    validos.forEach(f => this._extratoAddFile(f));
  }

  _extratoAddFile(file) {
    if (!this._extratoArquivos) this._extratoArquivos = [];
    // Evitar duplicatas por nome+tamanho
    const jaExiste = this._extratoArquivos.some(f => f.name === file.name && f.size === file.size);
    if (jaExiste) return;
    this._extratoArquivos.push(file);
    this._extratoRenderFileList();
  }

  _extratoRemoveFile(idx) {
    this._extratoArquivos.splice(idx, 1);
    this._extratoRenderFileList();
  }

  clearAllExtratoFiles() {
    this._extratoArquivos = [];
    this._extratoRenderFileList();
  }

  _extratoRenderFileList() {
    const list  = document.getElementById('extratoFileList');
    const items = document.getElementById('extratoFileItems');
    if (!list || !items) return;
    const files = this._extratoArquivos || [];
    if (!files.length) { list.style.display = 'none'; return; }
    list.style.display = '';
    items.innerHTML = files.map((f, i) => {
      const ext  = f.name.split('.').pop().toLowerCase();
      const icon = ext === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
      const cor  = ext === 'pdf' ? '#dc2626'     : '#7c3aed';
      const mb   = (f.size / 1024 / 1024).toFixed(2);
      return `<div style="display:flex;align-items:center;gap:.6rem;padding:.5rem .75rem;
                          background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:.35rem;">
        <i class="fas ${icon}" style="color:${cor};font-size:1.2rem;flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.83rem;font-weight:600;color:#334155;white-space:nowrap;
                      overflow:hidden;text-overflow:ellipsis;">${f.name}</div>
          <div style="font-size:.72rem;color:#94a3b8;">${mb} MB · ${ext.toUpperCase()}</div>
        </div>
        <button onclick="window.adminDashboard._extratoRemoveFile(${i})"
                style="background:none;border:none;color:#94a3b8;cursor:pointer;
                       font-size:.9rem;flex-shrink:0;padding:.2rem .4rem;border-radius:4px;"
                title="Remover">✕</button>
      </div>`;
    }).join('');
  }

  // ── Processamento principal ────────────────────────────────────────────

  async processExtrato() {
    const arquivos = this._extratoArquivos || [];
    if (!arquivos.length) {
      this.showNotification('Adicione pelo menos um arquivo PDF ou imagem.', 'warning');
      return;
    }
    if (typeof pdfjsLib === 'undefined') {
      this.showNotification('PDF.js não carregou ainda. Aguarde ou recarregue a página.', 'error');
      return;
    }

    this._extratoGoToStep(2);
    const setMsg      = m  => { const el = document.getElementById('extratoProcessMsg');   if (el) el.textContent = m; };
    const setTitle    = t  => { const el = document.getElementById('extratoProcessTitle');  if (el) el.textContent = t; };
    const setProgress = p  => {
      const bar  = document.getElementById('extratoProgressBar');
      const txt  = document.getElementById('extratoProgressText');
      if (bar) bar.style.width = p + '%';
      if (txt) txt.textContent = Math.round(p) + '%';
    };

    try {
      let textosExtraidos = [];
      const total = arquivos.length;

      for (let i = 0; i < total; i++) {
        const arquivo = arquivos[i];
        const ext     = arquivo.name.split('.').pop().toLowerCase();
        const pct_ini = (i / total) * 90;
        const pct_fim = ((i + 1) / total) * 90;

        setTitle(`Arquivo ${i+1} de ${total}`);
        setProgress(pct_ini);

        if (ext === 'pdf') {
          // ── PDF digital: PDF.js ─────────────────────────────────────
          setMsg(`Lendo PDF: ${arquivo.name}`);
          const buffer = await arquivo.arrayBuffer();
          const doc    = await pdfjsLib.getDocument({ data: buffer }).promise;
          let textoArq = '';

          for (let p = 1; p <= doc.numPages; p++) {
            setMsg(`PDF "${arquivo.name}" — página ${p}/${doc.numPages}`);
            setProgress(pct_ini + (p / doc.numPages) * (pct_fim - pct_ini) * 0.9);

            const pagina  = await doc.getPage(p);
            const content = await pagina.getTextContent();

            // Reconstruir com posicionamento Y para preservar linhas
            const itensOrdenados = content.items
              .filter(it => it.str.trim())
              .sort((a, b) => {
                const dy = Math.round(b.transform[5]) - Math.round(a.transform[5]);
                return dy !== 0 ? dy : a.transform[4] - b.transform[4];
              });

            let ultimoY  = null;
            let linhaBuf = [];
            const linhasP = [];

            for (const item of itensOrdenados) {
              const y = Math.round(item.transform[5]);
              if (ultimoY !== null && Math.abs(y - ultimoY) > 2) {
                linhasP.push(linhaBuf.join(' ').trim());
                linhaBuf = [];
              }
              linhaBuf.push(item.str);
              ultimoY = y;
            }
            if (linhaBuf.length) linhasP.push(linhaBuf.join(' ').trim());
            textoArq += linhasP.filter(Boolean).join('\n') + '\n\n';
          }

          if (textoArq.trim().length < 30) {
            // PDF é imagem — renderizar página e fazer OCR
            setMsg(`PDF "${arquivo.name}" parece ser escaneado — iniciando OCR…`);
            textoArq = await this._extratoOcrPdf(doc, arquivo.name, pct_ini, pct_fim, setMsg, setProgress);
          }

          textosExtraidos.push({ nome: arquivo.name, tipo: 'pdf', texto: textoArq });

        } else {
          // ── Imagem: Tesseract OCR ───────────────────────────────────
          setMsg(`OCR na imagem: ${arquivo.name}`);
          const texto = await this._extratoOcrImagem(arquivo, pct_ini, pct_fim, setMsg, setProgress);
          textosExtraidos.push({ nome: arquivo.name, tipo: 'imagem', texto });
        }
      }

      setProgress(92);
      setTitle('Calculando...');
      setMsg('Consolidando e analisando dados...');

      // Consolidar todos os textos
      const textoTotal = textosExtraidos.map(t => t.texto).join('\n\n--- PRÓXIMO ARQUIVO ---\n\n');
      const dados      = this._extratoAnalisar(textoTotal, arquivos.map(f=>f.name).join(', '), textosExtraidos);

      setProgress(100);
      this._extratoRenderResult(dados);
      this._extratoGoToStep(3);

    } catch(err) {
      console.error('[Extrato]', err);
      this._extratoGoToStep(1);
      this.showNotification('Erro ao processar: ' + (err.message || err), 'error');
    }
  }

  // ── OCR em páginas de PDF escaneado (renderiza canvas → Tesseract) ────────
  async _extratoOcrPdf(doc, nome, pctIni, pctFim, setMsg, setProgress) {
    let texto = '';
    for (let p = 1; p <= doc.numPages; p++) {
      setMsg(`OCR PDF "${nome}" — página ${p}/${doc.numPages}…`);
      setProgress(pctIni + (p / doc.numPages) * (pctFim - pctIni) * 0.9);
      const pagina  = await doc.getPage(p);
      const vp      = pagina.getViewport({ scale: 2.0 }); // scale 2 = melhor OCR
      const canvas  = document.createElement('canvas');
      canvas.width  = vp.width;
      canvas.height = vp.height;
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      const blob     = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const textoOcr = await this._extratoOcrImagem(blob, pctIni, pctFim, setMsg, setProgress);
      texto += textoOcr + '\n\n';
    }
    return texto;
  }

  // ── OCR de imagem via Tesseract.js ─────────────────────────────────────────
  async _extratoOcrImagem(fileOrBlob, pctIni, pctFim, setMsg, setProgress) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract.js não carregou. Verifique a conexão.');
    }
    return new Promise((resolve, reject) => {
      Tesseract.recognize(fileOrBlob, 'por+eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(pctIni + m.progress * (pctFim - pctIni));
            setMsg('OCR: ' + Math.round(m.progress * 100) + '%');
          }
        }
      }).then(({ data: { text } }) => resolve(text))
        .catch(reject);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MOTOR DE ANÁLISE — 100% JavaScript
  //  Prioridade 1: valores explícitos do banco (saldo final, totais)
  //  Prioridade 2: soma das transações identificadas
  // ─────────────────────────────────────────────────────────────────────────
  _extratoAnalisar(texto, nomeArquivo, fontes) {
    const linhas     = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const textoLower = texto.toLowerCase();

    const res = {
      banco: null, agencia: null, conta: null, titular: null, cpf: null,
      periodo: null, data_inicial: null, data_final: null,
      saldo_anterior: null, saldo_final: null,
      total_creditos: null, total_debitos: null,
      media_credito: null, media_debito: null,
      num_transacoes: 0, transacoes: [],
      maiores_creditos: [], maiores_debitos: [],
      alertas: [], arquivo: nomeArquivo,
      num_arquivos: (fontes || []).length,
      fontes: (fontes || []).map(f => ({ nome: f.nome, tipo: f.tipo })),
    };

    // ── Helpers ────────────────────────────────────────────────────────────
    const parseVal = raw => {
      if (!raw) return null;
      let s = String(raw).replace(/\s/g, '').trim();
      // Remover R$ e variações
      s = s.replace(/^R\$\s*/i, '').replace(/^\$/, '');
      const neg = s.startsWith('-') || s.startsWith('(');
      s = s.replace(/[()]/g, '').replace(/^-/, '');
      // Formatos brasileiros: 1.234.567,89 ou 1234,89 ou 1234.89
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (/^\d+(,\d+)$/.test(s)) {
        s = s.replace(',', '.');
      } else if (/^\d+\.\d{1,2}$/.test(s)) {
        // 1234.56 — já decimal
      } else if (/^\d+,\d{3}$/.test(s)) {
        // 1,234 — milhar sem decimal
        s = s.replace(',', '');
      }
      const n = parseFloat(s);
      return isNaN(n) ? null : (neg ? -n : n);
    };

    const fmtVal = v => {
      if (v == null) return 'N/D';
      const abs = Math.abs(v);
      const str = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (v < 0 ? '-' : '') + 'R$ ' + str;
    };

    const matchVal = re => {
      const m = texto.match(re);
      return m ? parseVal(m[1]) : null;
    };

    // ── Banco ──────────────────────────────────────────────────────────────
    const BANCOS = [
      [/itaú\s*unibanco|itaú\s*s\.a\.|banco\s*itaú/i, 'Itaú Unibanco'],
      [/bradesco/i, 'Bradesco'],
      [/santander/i, 'Santander'],
      [/caixa\s*econ[oô]mica/i, 'Caixa Econômica Federal'],
      [/banco\s*do\s*brasil/i, 'Banco do Brasil'],
      [/nubank/i, 'Nubank'],
      [/banco\s*inter\b|inter\s*bank/i, 'Banco Inter'],
      [/c6\s*bank/i, 'C6 Bank'],
      [/sicoob/i, 'Sicoob'],
      [/sicredi/i, 'Sicredi'],
      [/banco\s*original/i, 'Banco Original'],
      [/safra/i, 'Safra'],
      [/neon\s*pagamentos|banco\s*neon/i, 'Neon'],
      [/picpay/i, 'PicPay'],
      [/mercado\s*pago/i, 'Mercado Pago'],
      [/pagbank|pagseguro/i, 'PagBank'],
      [/will\s*bank/i, 'Will Bank'],
      [/bs2/i, 'BS2'],
      [/modal\s*mais|banco\s*modal/i, 'Banco Modal'],
      [/next\s*bank|banco\s*next/i, 'Next'],
    ];
    for (const [re, nome] of BANCOS) {
      if (re.test(textoLower)) { res.banco = nome; break; }
    }

    // ── CPF / titular ──────────────────────────────────────────────────────
    const mCpf = texto.match(/\b(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2})\b/);
    if (mCpf) res.cpf = mCpf[1].replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    const mTit = texto.match(/(?:titular|cliente|nome|correntista|cliente)[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃẼÕÇ][A-Za-záéíóúàâêôãẽõç\s]{4,50}?)(?:\n|CPF|CNPJ|Ag|$)/im);
    if (mTit) res.titular = mTit[1].trim();

    // ── Agência / Conta ────────────────────────────────────────────────────
    const mAg = texto.match(/ag[eê]ncia[:\s.]*(\d[\d\-]{3,8})/i);
    if (mAg) res.agencia = mAg[1];
    const mCt = texto.match(/(?:^|\s)c(?:\.c\.|onta corrente|onta)[:\s.]*(\d[\d\-./]{3,14})/im);
    if (mCt) res.conta = mCt[1];

    // ── Datas ──────────────────────────────────────────────────────────────
    const RE_DATA = /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b/g;
    const parseDt = s => {
      const [a,b,c] = s.split(/[\/.\-]/);
      const d = +a, mo = +b, y = +c;
      if (y>1900 && y<2100 && mo>=1 && mo<=12 && d>=1 && d<=31) return new Date(y, mo-1, d);
      return null;
    };
    const datas = [...texto.matchAll(RE_DATA)].map(m => parseDt(m[1])).filter(Boolean).sort((a,b)=>a-b);
    if (datas.length) {
      const fd = d => d.toLocaleDateString('pt-BR');
      res.data_inicial = fd(datas[0]);
      res.data_final   = fd(datas[datas.length-1]);
      res.periodo = datas.length > 1 ? `${fd(datas[0])} a ${fd(datas[datas.length-1])}` : fd(datas[0]);
    }

    // ── Saldo anterior ─────────────────────────────────────────────────────
    res.saldo_anterior = matchVal(/saldo\s+(?:anterior|inicial|do\s+per[íi]odo|em\s+\d{2}\/\d{2})[:\s]*([-R$\d.,]+)/i);

    // ── Saldo final ────────────────────────────────────────────────────────
    // Tenta múltiplos padrões em ordem de confiança
    const PADROES_SALDO_FINAL = [
      /saldo\s+final[:\s]*([-R$\d.,]+)/i,
      /saldo\s+(?:atual|dispon[íi]vel)[:\s]*([-R$\d.,]+)/i,
      /saldo\s+em\s+\d{2}\/\d{2}\/\d{4}[:\s]*([-R$\d.,]+)/i,
      /(?:^|\n)\s*saldo[:\s]*([-R$\d.,]+)\s*$/im,
    ];
    for (const re of PADROES_SALDO_FINAL) {
      const v = matchVal(re);
      if (v !== null) { res.saldo_final = v; break; }
    }

    // ── Totais explícitos ──────────────────────────────────────────────────
    res.total_creditos = matchVal(/total\s+(?:de\s+)?cr[eé]ditos?[:\s]*([-R$\d.,]+)/i);
    res.total_debitos  = matchVal(/total\s+(?:de\s+)?d[eé]bitos?[:\s]*([-R$\d.,]+)/i);

    // ── Extração de transações ─────────────────────────────────────────────
    // Padrões comuns de extratos bancários brasileiros:
    // 01/01/2024  DESCRIÇÃO  1.234,56  1.234,56
    // 01/01/2024  DESCRIÇÃO  C  1.234,56
    // 01/01/2024  DESCRIÇÃO  D  1.234,56

    const RE_TX = /^(\d{2}[\/.\-]\d{2}(?:[\/.\-]\d{2,4})?)\s+(.{3,60}?)\s+([-+]?R?\$?\s*[\d.,]{3,})(?:\s+([-+]?R?\$?\s*[\d.,]{3,}))?$/;
    const RE_TX2 = /^(\d{2}[\/.\-]\d{2}(?:[\/.\-]\d{2,4})?)\s+(.{3,60}?)\s+([CD])\s+(R?\$?\s*[\d.,]{3,})$/i;
    const vistos = new Set();

    for (const linha of linhas) {
      // Tentar padrão C/D primeiro
      let data, desc, valor, tipo;
      const m2 = RE_TX2.exec(linha);
      if (m2) {
        data  = m2[1]; desc = m2[2].trim();
        tipo  = m2[3].toUpperCase() === 'C' ? 'credito' : 'debito';
        valor = Math.abs(parseVal(m2[4]) || 0);
      } else {
        const m1 = RE_TX.exec(linha);
        if (!m1) continue;
        data  = m1[1]; desc = m1[2].trim();
        const vStr = m1[3];
        valor = parseVal(vStr);
        if (valor === null || Math.abs(valor) < 0.01) continue;

        const dl    = desc.toLowerCase();
        const ehDeb = /d[eé]bito|pagamento|compra|saque|saída|ted\s+envi|doc\s+envi|pix\s+envi|transfer[eê]ncia\s+envi|boleto\s+pago|tarifa|taxa|encargo|débito|estorno\s+cr/.test(dl);
        const ehCred= /cr[eé]dito|dep[oó]sito|recebimento|pix\s+receb|ted\s+receb|transfer[eê]ncia\s+receb|salário|proventos|rendimento|juros\s+receb|estorno\s+db/.test(dl);

        if (vStr.includes('-') || valor < 0)  { tipo = 'debito';  valor = Math.abs(valor); }
        else if (ehDeb && !ehCred)             { tipo = 'debito'; }
        else if (ehCred && !ehDeb)             { tipo = 'credito'; }
        else                                   { tipo = 'credito'; } // conservador: dúvida = crédito
      }

      if (!valor || valor < 0.01) continue;
      const chave = `${data}|${desc.slice(0,20)}|${valor.toFixed(2)}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      res.transacoes.push({ data, descricao: desc, valor, tipo, valor_fmt: fmtVal(valor) });
    }

    res.num_transacoes = res.transacoes.length;

    // ── Calcular totais pelas transações (fallback se banco não informou) ──
    const creds = res.transacoes.filter(t => t.tipo === 'credito').map(t => t.valor);
    const debs  = res.transacoes.filter(t => t.tipo === 'debito' ).map(t => t.valor);
    const sum   = arr => arr.length ? +arr.reduce((a,b)=>a+b,0).toFixed(2) : null;

    if (res.total_creditos === null) res.total_creditos = sum(creds);
    if (res.total_debitos  === null) res.total_debitos  = sum(debs);
    if (creds.length) res.media_credito = +(sum(creds) / creds.length).toFixed(2);
    if (debs.length)  res.media_debito  = +(sum(debs)  / debs.length ).toFixed(2);

    // ── Saldo final calculado (caso banco não informe) ─────────────────────
    if (res.saldo_final === null && res.saldo_anterior !== null && res.total_creditos !== null && res.total_debitos !== null) {
      res.saldo_final = +(res.saldo_anterior + res.total_creditos - res.total_debitos).toFixed(2);
      res.alertas.push({ tipo: 'info', msg: 'Saldo final calculado a partir das transações (não encontrado explicitamente no extrato).' });
    }

    // ── Top 5 ──────────────────────────────────────────────────────────────
    res.maiores_creditos = [...res.transacoes].filter(t=>t.tipo==='credito').sort((a,b)=>b.valor-a.valor).slice(0,5);
    res.maiores_debitos  = [...res.transacoes].filter(t=>t.tipo==='debito' ).sort((a,b)=>b.valor-a.valor).slice(0,5);

    // ── Alertas ────────────────────────────────────────────────────────────
    if (res.saldo_final !== null && res.saldo_final < 0)
      res.alertas.push({ tipo: 'danger', msg: `Saldo final NEGATIVO: ${fmtVal(res.saldo_final)}` });
    if (res.saldo_final !== null && res.saldo_final >= 0 && res.saldo_final < 500)
      res.alertas.push({ tipo: 'warning', msg: 'Saldo final abaixo de R$ 500,00' });
    if (res.total_debitos && res.total_creditos && res.total_debitos > res.total_creditos)
      res.alertas.push({ tipo: 'warning', msg: 'Total de débitos supera o total de créditos no período' });
    if (res.num_transacoes === 0)
      res.alertas.push({ tipo: 'warning', msg: 'Nenhuma transação identificada. O layout do extrato pode ser diferente do padrão.' });

    // ── Formatar ───────────────────────────────────────────────────────────
    res.saldo_anterior_fmt = fmtVal(res.saldo_anterior);
    res.saldo_final_fmt    = fmtVal(res.saldo_final);
    res.total_creditos_fmt = fmtVal(res.total_creditos);
    res.total_debitos_fmt  = fmtVal(res.total_debitos);
    res.media_credito_fmt  = fmtVal(res.media_credito);
    res.media_debito_fmt   = fmtVal(res.media_debito);
    for (const t of [...res.maiores_creditos, ...res.maiores_debitos]) t.valor_fmt = fmtVal(t.valor);

    return res;
  }

  // ── Renderização do resultado ──────────────────────────────────────────────
  _extratoRenderResult(d) {
    const alertasHtml = (d.alertas || []).map(a => {
      const cores = {
        danger:  { bg: '#fef2f2', borda: '#dc2626', txt: '#991b1b', icon: 'fa-circle-exclamation' },
        warning: { bg: '#fffbeb', borda: '#f59e0b', txt: '#92400e', icon: 'fa-triangle-exclamation' },
        info:    { bg: '#eff6ff', borda: '#2563eb', txt: '#1e40af', icon: 'fa-circle-info' },
      };
      const c = cores[a.tipo] || cores.info;
      return `<div style="padding:.6rem 1rem;border-radius:8px;margin-bottom:.5rem;font-size:.84rem;
                          background:${c.bg};border-left:4px solid ${c.borda};color:${c.txt};">
        <i class="fas ${c.icon}"></i> ${a.msg}</div>`;
    }).join('');

    const cards = [
      { label: 'Saldo Final',    val: d.saldo_final_fmt,    icon: 'fa-wallet',            cor: d.saldo_final < 0 ? '#dc2626' : '#16a34a', bg: d.saldo_final < 0 ? '#fef2f2' : '#f0fdf4' },
      { label: 'Saldo Anterior', val: d.saldo_anterior_fmt, icon: 'fa-clock-rotate-left', cor: '#2563eb', bg: '#eff6ff' },
      { label: 'Créditos',       val: d.total_creditos_fmt, icon: 'fa-arrow-up',          cor: '#16a34a', bg: '#f0fdf4' },
      { label: 'Débitos',        val: d.total_debitos_fmt,  icon: 'fa-arrow-down',        cor: '#dc2626', bg: '#fef2f2' },
      { label: 'Média Crédito',  val: d.media_credito_fmt,  icon: 'fa-chart-simple',      cor: '#0891b2', bg: '#ecfeff' },
      { label: 'Média Débito',   val: d.media_debito_fmt,   icon: 'fa-chart-simple',      cor: '#7c3aed', bg: '#f5f3ff' },
    ];

    const cardsHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem;margin-bottom:1.1rem;">
      ${cards.map(c => `
        <div style="background:${c.bg};border-radius:10px;padding:.8rem .9rem;">
          <div style="font-size:.72rem;color:#64748b;margin-bottom:.2rem;">
            <i class="fas ${c.icon}" style="color:${c.cor};"></i> ${c.label}
          </div>
          <div style="font-size:.95rem;font-weight:700;color:${c.cor};">${c.val}</div>
        </div>`).join('')}
    </div>`;

    const infoItems = [
      ['Banco',   d.banco],
      ['Titular', d.titular],
      ['CPF',     d.cpf],
      ['Agência', d.agencia],
      ['Conta',   d.conta],
      ['Período', d.periodo],
      ['Arquivos',d.num_arquivos > 1 ? `${d.num_arquivos} arquivos` : null],
    ].filter(([,v]) => v);

    const infoHtml = infoItems.length ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                  padding:.8rem 1rem;margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;">
        ${infoItems.map(([k,v]) => `
          <div>
            <div style="font-size:.7rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;">${k}</div>
            <div style="font-size:.85rem;font-weight:600;color:#334155;">${v}</div>
          </div>`).join('')}
      </div>` : '';

    const tabelaTop = (lista, titulo, cor) => {
      if (!lista?.length) return '';
      return `<div style="margin-bottom:1rem;">
        <h4 style="font-size:.78rem;font-weight:700;color:#475569;margin:0 0 .5rem;
                   text-transform:uppercase;letter-spacing:.5px;">${titulo}</h4>
        <table style="width:100%;border-collapse:collapse;font-size:.8rem;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:5px 8px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Data</th>
              <th style="padding:5px 8px;text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Descrição</th>
              <th style="padding:5px 8px;text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${lista.map((t,i) => `
              <tr style="background:${i%2?'#f8fafc':'#fff'};">
                <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;color:#94a3b8;white-space:nowrap;">${t.data}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;color:#334155;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.descricao}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;color:${cor};font-weight:700;text-align:right;">${t.valor_fmt}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    };

    const numTx = d.num_transacoes;
    document.getElementById('extratoResult').innerHTML = `
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem;">
        <div style="width:30px;height:30px;background:#0891b2;border-radius:7px;
                    display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-chart-bar" style="color:#fff;font-size:.85rem;"></i>
        </div>
        <h3 style="margin:0;font-size:.95rem;color:#0f172a;font-weight:700;">
          Resultado da Análise
          ${d.banco ? `<span style="font-size:.78rem;color:#94a3b8;font-weight:400;margin-left:.4rem;">— ${d.banco}</span>` : ''}
        </h3>
      </div>
      ${alertasHtml}
      ${infoHtml}
      ${cardsHtml}
      ${tabelaTop(d.maiores_creditos, '🟢 Maiores Créditos', '#16a34a')}
      ${tabelaTop(d.maiores_debitos,  '🔴 Maiores Débitos',  '#dc2626')}
      <p style="font-size:.7rem;color:#cbd5e1;text-align:center;margin-top:.5rem;border-top:1px solid #f1f5f9;padding-top:.5rem;">
        ${numTx} transação(ões) identificada(s) · ${d.arquivo}
      </p>`;
  }


} // Fim da classe AdminDashboard

Object.assign(AdminDashboard.prototype, {

// ==================== MÓDULO DE NOTAS FISCAIS (UNIFICADO - GRID) ====================
setupNotasFiscaisModule() {
    // Elements & IDs used in HTML: notasFiscaisListContainer, notaFiscalAddModal, notaFiscalAddForm, notaFiscalArquivo,
    // notaFiscalDetailsModal, notaFiscalDetailsModalContent, notaFiscalDetailsActions, btn to open modal (upload button)
    try {
        // Bind upload modal open button if present
        const openUploadBtn = document.querySelector('[onclick="adminDashboard.openUploadNotaFiscalModal()"]') || document.querySelector('.btn-upload-nota') ;
        if (openUploadBtn) {
            openUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openNotaFiscalAddModal();
            });
        }
    } catch (err) {
        console.warn('upload button bind failed', err);
    }

    // Form submit
    const form = document.getElementById('notaFiscalAddForm');
    if (form) {
        form.removeEventListener && form.removeEventListener('submit', this._boundUploadNotaFiscal);
        this._boundUploadNotaFiscal = (e) => { e.preventDefault(); this.uploadNotaFiscal(); };
        form.addEventListener('submit', this._boundUploadNotaFiscal);
    }

    // Close details modal (delegation)
    const detailsModal = document.getElementById('notaFiscalDetailsModal');
    if (detailsModal) {
        detailsModal.addEventListener('click', (ev) => {
            if (ev.target === detailsModal) detailsModal.style.display = 'none';
        });
    }

    // Initialize state
    this.allNotasFiscais = this.allNotasFiscais || [];
    this.loadNotasFiscais();
    this.loadNotasFiscaisStats();
},

openUploadNotaFiscalModal() {
    this.openNotaFiscalAddModal();
},

openNotaFiscalAddModal() {
    const modal = document.getElementById('notaFiscalAddModal');
    if (modal) {
        try {
            const form = document.getElementById('notaFiscalAddForm');
            if (form) form.reset();
        } catch(e){}
        modal.style.display = 'flex';
    } else {
        this.showNotification('Modal de upload não encontrado', 'error');
    }
},

closeNotaFiscalAddModal() {
    const modal = document.getElementById('notaFiscalAddModal');
    if (modal) modal.style.display = 'none';
},

async uploadNotaFiscal() {
    const form = document.getElementById('notaFiscalAddForm');
    if (!form) {
        this.showNotification('Formulário de nota fiscal não encontrado', 'error');
        return;
    }

    const fileInput = document.getElementById('notaFiscalArquivo') || document.getElementById('nfArquivo') || document.getElementById('nfFiles');
    if (!fileInput || (!fileInput.files.length && !window.__TAURI__)) {
        this.showNotification('Selecione ao menos um arquivo (XML ou PDF)', 'error');
        return;
    }

    let arquivo = fileInput.files[0];
    if (!arquivo && window.__TAURI__) { arquivo = await tauriOpenFile([{ name: 'Nota Fiscal', extensions: ['pdf', 'xml'] }]); }
    const ext = arquivo.name.split('.').pop().toLowerCase();
    if (!['xml','pdf'].includes(ext)) {
        this.showNotification('Apenas XML e PDF são permitidos', 'error');
        return;
    }
    if (arquivo.size > 50 * 1024 * 1024) {
        this.showNotification('O arquivo excede o limite de 50MB', 'error');
        return;
    }

    const formData = new FormData(form);
    formData.append('action', 'upload_nota_fiscal');

    // ensure arquivo is appended if input name differs
    if (!formData.has('arquivo')) formData.append('arquivo', arquivo);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; }

    try {
        const res = await fetch(this.apiEndpoint, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            this.showNotification('Nota fiscal enviada com sucesso!', 'success');
            this.closeNotaFiscalAddModal();
            await this.loadNotasFiscais();
            this.loadNotasFiscaisStats();
        } else {
            this.showNotification(data.error || 'Erro ao enviar nota fiscal', 'error');
        }
    } catch (err) {
        console.error('uploadNotaFiscal error', err);
        this.showNotification('Erro de conexão ao enviar nota fiscal', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
    }
},

async loadNotasFiscais() {
    const container = document.getElementById('notasFiscaisListContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Carregando notas fiscais...</div>';

    try {
        const res = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_notas_fiscais' })
        });
        const data = await res.json();
        if (data.success) {
            this.allNotasFiscais = data.data.notas_fiscais || [];
            this.renderNotasFiscais(this.allNotasFiscais);
        } else {
            container.innerHTML = '<div class="error-message">Erro ao carregar notas fiscais</div>';
        }
    } catch (err) {
        console.error('loadNotasFiscais', err);
        container.innerHTML = '<div class="error-message">Erro ao carregar notas fiscais</div>';
    }
},

async loadNotasFiscaisStats() {
    try {
        const res = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_notas_fiscais_stats' })
        });
        const data = await res.json();
        if (data.success) {
            const stats = data.data;
            // Atualizar os 4 cards de estatísticas
            document.getElementById('totalNotasFiscaisCount').textContent = stats.total_notas || 0;
            document.getElementById('notasFiscaisRecentesCount').textContent = stats.notas_recentes || 0;
            document.getElementById('notasXmlCount').textContent = stats.notas_xml || 0;
            document.getElementById('notasPdfCount').textContent = stats.notas_pdf || 0;
        }
    } catch (err) {
        console.error('loadNotasFiscaisStats', err);
    }
},

renderNotasFiscais(notasFiscais) {
    const container = document.getElementById('notasFiscaisListContainer');
    if (!container) return;

    if (!notasFiscais || notasFiscais.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice" style="font-size:3rem;"></i>
                <h3>Nenhuma Nota Fiscal Encontrada</h3>
                <p>Clique em "Upload de Nota Fiscal" para adicionar.</p>
            </div>`;
        return;
    }

    const grid = notasFiscais.map(nf => {
        const tipo = (nf.arquivo_tipo || nf.arquivo_nome || '').toLowerCase().includes('xml') ? 'xml' : (nf.arquivo_tipo||'pdf');
        const icon = tipo === 'xml' ? 'fa-file-code' : 'fa-file-pdf';
        const colorClass = tipo === 'xml' ? 'nota-xml' : 'nota-pdf';
        const arquivoNome = nf.arquivo_nome || (nf.arquivo_path ? nf.arquivo_path.split('/').pop() : 'arquivo');
        return `
        <div class="nota-card ${colorClass}" data-id="${nf.id}" style="background:var(--card-bg); border-radius:12px; padding:1rem; box-shadow:var(--shadow);">
            <div class="nota-header" style="display:flex; align-items:center; gap:0.75rem;">
                <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.04);">
                    <i class="fas ${icon}"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;">${nf.nome_cliente || nf.cliente || 'Sem cliente'}</div>
                    <div style="font-size:0.85rem; color:var(--text-light);">${arquivoNome}</div>
                </div>
            </div>
            <div style="margin-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.9rem; color:var(--text-light);">${this.formatDate ? this.formatDate(nf.created_at) : (nf.created_at||'')}</div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-sm btn-info" data-action="view" data-id="${nf.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-success" data-action="download" data-id="${nf.id}"><i class="fas fa-download"></i></button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${nf.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="notas-grid" style="display:grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap:1rem;">${grid}</div>`;

    // Attach actions
    container.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            if (action === 'view') this.viewNotaFiscalDetails(id);
            if (action === 'download') this.downloadNotaFiscal(id);
            if (action === 'delete') this.deleteNotaFiscal(id);
        });
    });

    // Card click opens details
    container.querySelectorAll('.nota-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            this.viewNotaFiscalDetails(id);
        });
    });
},

viewNotaFiscalDetails(id) {
    // prefer cached data
    const cached = (this.allNotasFiscais || []).find(n => String(n.id) === String(id));
    if (cached) {
        this._populateNotaModal(cached);
        document.getElementById('notaFiscalDetailsModal').style.display = 'flex';
        return;
    }
    // else fetch details
    fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_nota_fiscal_details', id: id })
    }).then(r=>r.json()).then(data => {
        if (data.success && data.nota_fiscal) {
            this._populateNotaModal(data.nota_fiscal);
            document.getElementById('notaFiscalDetailsModal').style.display = 'flex';
        } else if (data.success && data.data && data.data.nota_fiscal) {
            this._populateNotaModal(data.data.nota_fiscal);
            document.getElementById('notaFiscalDetailsModal').style.display = 'flex';
        } else {
            this.showNotification(data.error || 'Erro ao buscar detalhes', 'error');
        }
    }).catch(err=>{
        console.error('viewNotaFiscalDetails', err);
        this.showNotification('Erro ao buscar detalhes da nota fiscal', 'error');
    });
},

_populateNotaModal(nf) {
    const content = document.getElementById('notaFiscalDetailsModalContent');
    const actions = document.getElementById('notaFiscalDetailsActions');
    if (!content || !actions) return;

    const arquivoNome = nf.arquivo_nome || (nf.arquivo_path ? nf.arquivo_path.split('/').pop() : 'arquivo');
    content.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div><strong>Cliente</strong><div>${nf.nome_cliente || nf.cliente || '-'}</div></div>
            <div><strong>CPF</strong><div>${nf.cpf || '-'}</div></div>
            <div><strong>Local</strong><div>${nf.local || '-'}</div></div>
            <div><strong>Telefone</strong><div>${nf.telefone || '-'}</div></div>
            <div style="grid-column:1/-1;"><strong>Data:</strong><div>${this.formatDate ? this.formatDate(nf.created_at) : (nf.created_at||'-')}</div></div>
            <div style="grid-column:1/-1;"><strong>Arquivo:</strong><div>${arquivoNome}</div></div>
        </div>
    `;

    actions.innerHTML = `
        <button class="btn btn-success" id="notaDownloadBtn"><i class="fas fa-download"></i> Baixar arquivo</button>
        <button class="btn btn-danger" id="notaDeleteBtn"><i class="fas fa-trash"></i> Deletar nota</button>
        <button class="btn btn-secondary" id="notaCloseBtn"><i class="fas fa-times"></i> Fechar</button>
    `;

    document.getElementById('notaDownloadBtn').addEventListener('click', ()=> this.downloadNotaFiscal(nf.id));
    document.getElementById('notaDeleteBtn').addEventListener('click', ()=> this.deleteNotaFiscal(nf.id));
    document.getElementById('notaCloseBtn').addEventListener('click', ()=> document.getElementById('notaFiscalDetailsModal').style.display = 'none');
},

async deleteNotaFiscal(id) {
    if (!confirm('Deseja realmente deletar esta nota fiscal?')) return;
    try {
        const res = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_nota_fiscal', id: id })
        });
        const data = await res.json();
        if (data.success) {
            this.showNotification('Nota fiscal deletada', 'success');
            await this.loadNotasFiscais();
            document.getElementById('notaFiscalDetailsModal') && (document.getElementById('notaFiscalDetailsModal').style.display = 'none');
        } else {
            this.showNotification(data.error || 'Erro ao deletar nota fiscal', 'error');
        }
    } catch (err) {
        console.error('deleteNotaFiscal', err);
        this.showNotification('Erro ao deletar nota fiscal', 'error');
    }
},

async downloadNotaFiscal(id) {
    // open direct download
    const url = `${this.apiEndpoint}?action=download_nota_fiscal&nota_fiscal_id=${encodeURIComponent(id)}`;
    if (window.__TAURI__) {
      await this.tauriDownloadFile(url, `nota_fiscal_${id}.pdf`, [{ name: 'Nota Fiscal', extensions: ['pdf', 'xml'] }]);
    } else {
      const w = window.open(url, '_blank');
      if (!w) this.showNotification('Bloqueador de popups impediu o download', 'error');
    }
},

// ==================== FIM MÓDULO DE NOTAS FISCAIS ====================
  /**
   * Carrega o conteúdo do tutorial baseado no perfil do usuário
   */
  loadTutorialContent() {
    console.log('⭐ loadTutorialContent called. User:', this.user?.email, 'Type:', this.user?.user_type);
    const tutorialContent = document.getElementById('tutorialContent');
    if (!tutorialContent) {
        console.error('❌ Element tutorialContent not found');
        return;
    }
    if (!this.user) {
        console.error('❌ User not logged in');
        return;
    }

    const userType = this.normalizeUserType(this.user.user_type);
    console.log('⭐ Normalized User Type:', userType);
    let html = '';

    if (userType === 'administrador') {
      html = `
        <div class="tutorial-card" style="grid-column: 1 / -1; text-align: center; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%); color: white;">
          <i class="fas fa-rocket" style="color: white; font-size: 3rem;"></i>
          <h3 style="color: white;">Tour do Administrador</h3>
          <p style="color: rgba(255,255,255,0.9);">Deseja um guia rápido pelas ferramentas de gestão? Inicie o tour agora!</p>
          <button class="btn btn-light" onclick="adminDashboard.startSystemTour()" style="margin-top: 1rem; background: white; color: var(--primary-color);">
            <i class="fas fa-play"></i> Iniciar Tour Dinâmico
          </button>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-chart-line"></i>
          <h3>Visão Geral & Dashboard</h3>
          <p>Como administrador, você tem acesso total às estatísticas globais do sistema.</p>
          <ul>
            <li>Visualize o total de propostas por status.</li>
            <li>Acompanhe o crescimento através dos gráficos interativos.</li>
            <li>Filtre propostas por banco e período para análises específicas.</li>
          </ul>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-users-cog"></i>
          <h3>Gestão de Especialistas</h3>
          <p>Monitore o desempenho de cada especialista individualmente.</p>
          <ul>
            <li>Acesse as seções exclusivas de cada especialista na barra lateral.</li>
            <li>Aprove, reprove ou altere o status das propostas enviadas.</li>
            <li>Inicie conversas diretas sobre propostas específicas.</li>
          </ul>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-file-invoice-dollar"></i>
          <h3>Financeiro & Documentos</h3>
          <p>Controle completo sobre a parte burocrática e financeira.</p>
          <ul>
            <li>Gerencie notas fiscais e contratos de todos os clientes.</li>
            <li>Acompanhe o fluxo financeiro na aba dedicada dentro da Visão Geral.</li>
            <li>Exporte relatórios e planilhas conforme necessário.</li>
          </ul>
        </div>
      `;
    } else {
      html = `
        <div class="tutorial-card" style="grid-column: 1 / -1; text-align: center; background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%); color: white;">
          <i class="fas fa-rocket" style="color: white; font-size: 3rem;"></i>
          <h3 style="color: white;">Tour Interativo</h3>
          <p style="color: rgba(255,255,255,0.9);">Prefere um guia passo a passo? Clique no botão abaixo para um tour completo pelo sistema!</p>
          <button class="btn btn-light" onclick="adminDashboard.startSystemTour()" style="margin-top: 1rem; background: white; color: var(--primary-color);">
            <i class="fas fa-play"></i> Iniciar Tour Dinâmico
          </button>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-plus-circle"></i>
          <h3>Minhas Propostas</h3>
          <p>Esta é sua área de trabalho principal para gerenciar seus clientes.</p>
          <ul>
            <li>Cadastre novas propostas preenchendo os dados do cliente e veículo.</li>
            <li>Anexe documentos necessários diretamente na proposta.</li>
            <li>Acompanhe o status de aprovação em tempo real.</li>
          </ul>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-comments"></i>
          <h3>Comunicação</h3>
          <p>Mantenha contato direto com a administração e clientes.</p>
          <ul>
            <li>Use a aba de Conversas para tirar dúvidas sobre propostas.</li>
            <li>Receba notificações quando houver atualizações em seus processos.</li>
          </ul>
        </div>
        <div class="tutorial-card">
          <i class="fas fa-folder-open"></i>
          <h3>Meus Documentos</h3>
          <p>Organização de arquivos e contratos dos seus clientes.</p>
          <ul>
            <li>Acesse a aba de Documentos para visualizar arquivos enviados.</li>
            <li>Gerencie contratos e garanta que toda a documentação esteja em dia.</li>
          </ul>
        </div>
      `;
    }

    tutorialContent.innerHTML = html;
  },

  /**
   * Verifica se é o primeiro acesso para mostrar o modal de boas-vindas
   */
  checkFirstAccess() {
    const welcomeKey = `welcome_shown_${this.user.email}`;
    const welcomeShown = localStorage.getItem(welcomeKey);

    if (!welcomeShown) {
      const modal = document.getElementById('welcomeModal');
      if (modal) {
        modal.style.display = 'flex';
        localStorage.setItem(welcomeKey, 'true');
      }
    }
  },

  /**
   * Lógica do Tour Interativo para Especialistas
   */
  startSystemTour() {
    console.log('⭐ Iniciando Tour do Sistema');
    const userType = this.normalizeUserType(this.user.user_type);
    
    this.tourSteps = [
      {
        element: '.admin-sidebar',
        title: 'Barra Lateral',
        description: 'Aqui você acessa todas as áreas do sistema. O menu se adapta ao seu perfil.',
        position: 'right'
      }
    ];

    if (userType !== 'administrador') {
      this.tourSteps.push(
        {
          element: `.nav-item[data-section="${userType}"]`,
          section: userType,
          title: 'Minhas Propostas',
          description: 'Esta é sua área de trabalho principal. Aqui você gerencia todos os seus processos.',
          position: 'right'
        },
        {
          element: `.tab-btn[data-tab="propostas-${userType}"]`,
          section: userType,
          tab: `propostas-${userType}`,
          title: 'Gestão de Propostas',
          description: 'Ao clicar em uma proposta, você pode ver detalhes, mudar o status, editar informações ou gerar um PDF completo do processo.',
          position: 'bottom'
        },
        {
          element: `.tab-btn[data-tab="documentos-${userType}"]`,
          section: userType,
          tab: `documentos-${userType}`,
          title: 'Documentos do Cliente',
          description: 'Gerencie e visualize todos os arquivos enviados. Essencial para conferência de dados.',
          position: 'bottom'
        },
        {
          element: `.tab-btn[data-tab="clientes-${userType}"]`,
          section: userType,
          tab: `clientes-${userType}`,
          title: 'Base de Clientes',
          description: 'Histórico completo de todos os seus clientes e contatos cadastrados.',
          position: 'bottom'
        },
        {
          element: `.tab-btn[data-tab="contratos-${userType}"]`,
          section: userType,
          tab: `contratos-${userType}`,
          title: 'Contratos e Formalização',
          description: 'Área dedicada para upload e controle de contratos assinados.',
          position: 'bottom'
        }
      );
    } else {
      this.tourSteps.push({
        element: '.nav-item[data-section="overview"]',
        title: 'Painel Admin',
        description: 'Tenha uma visão macro de todo o sistema e desempenho da equipe.',
        position: 'right'
      });
    }

    this.tourSteps.push(
      {
        element: '.nav-item[data-section="chats"]',
        section: 'chats',
        title: 'Comunicação Direta',
        description: 'Use esta aba para se comunicar diretamente com os clientes, tirar dúvidas e resolver pendências de forma rápida.',
        position: 'right'
      },
      {
        element: '.nav-item[data-section="tutorial"]',
        title: 'Tutorial',
        description: 'Dúvidas? Volte aqui para ver este guia ou o texto explicativo.',
        position: 'right'
      },
      {
        element: '#themeToggle',
        title: 'Modo Escuro',
        description: 'Alterne o tema para seu conforto visual.',
        position: 'top'
      }
    );

    this.currentTourStep = 0;
    this.showTourStep();
  },

  showTourStep() {
    const step = this.tourSteps[this.currentTourStep];
    
    // Sincronização Automática de Seção e Tab
    if (step.section) {
        this.showSection(step.section);
        // Garantir que o item da navegação lateral também fique visualmente ativo
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.section === step.section) nav.classList.add('active');
        });
    }
    if (step.tab) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${step.tab}"]`);
        if (tabBtn) {
            tabBtn.click();
            
            // Encontrar o container da seção atual para não desativar abas de outras seções
            const sectionContainer = tabBtn.closest('.admin-section');
            if (sectionContainer) {
                sectionContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                tabBtn.classList.add('active');
                
                sectionContainer.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                    if (content.getAttribute('data-tab-content') === step.tab) {
                        content.classList.add('active');
                    }
                });
            }
        }
    }

    const targetEl = document.querySelector(step.element);
    const overlay = document.getElementById('tourOverlay');
    const popover = document.getElementById('tourPopover');

    if (!targetEl || !overlay || !popover) return;

    // Garantir que o elemento esteja visível após a troca de seção/tab
    setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
        overlay.style.display = 'block';
        popover.style.display = 'block';
        targetEl.classList.add('tour-highlight');
    
        // Atualizar conteúdo primeiro para calcular tamanho correto
        document.getElementById('tourTitle').textContent = step.title;
        document.getElementById('tourDescription').textContent = step.description;
        document.getElementById('tourStepIndicator').textContent = `${this.currentTourStep + 1} / ${this.tourSteps.length}`;

        // Posicionamento Inteligente
        const rect = targetEl.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const margin = 10;
        let top, left;

        if (step.position === 'right') {
          top = rect.top + (rect.height / 2) - (popoverRect.height / 2);
          left = rect.right + margin;
        } else if (step.position === 'top') {
          top = rect.top - popoverRect.height - margin;
          left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
        } else if (step.position === 'bottom') {
          top = rect.bottom + margin;
          left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
        } else {
          top = rect.top + (rect.height / 2) - (popoverRect.height / 2);
          left = rect.left - popoverRect.width - margin;
        }

        // Ajustes de borda (Prevenção de corte)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < margin) left = margin;
        if (left + popoverRect.width > viewportWidth - margin) left = viewportWidth - popoverRect.width - margin;
        if (top < margin) top = margin;
        if (top + popoverRect.height > viewportHeight - margin) top = viewportHeight - popoverRect.height - margin;

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        
        const nextBtn = document.getElementById('tourNextBtn');
        nextBtn.textContent = this.currentTourStep === this.tourSteps.length - 1 ? 'Finalizar' : 'Próximo';
        
        nextBtn.onclick = () => {
          if (this.currentTourStep < this.tourSteps.length - 1) {
            this.currentTourStep++;
            this.showTourStep();
          } else {
            this.endTour();
          }
        };
        
        document.getElementById('tourSkipBtn').onclick = () => this.endTour();
    }, 150); // Pequeno delay para garantir renderização da tab/seção
  },

  endTour() {
    document.getElementById('tourOverlay').style.display = 'none';
    document.getElementById('tourPopover').style.display = 'none';
    document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
    this.showNotification('Tour finalizado! Explore o sistema.', 'success');
  }

}); // Fim do Object.assign

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
    
    // Configuração dos botões de Nova Proposta (Global e Especialistas)
    const proposalButtons = [
        'addProposalBtn',
        'addProposalBtnFabricio',
        'addProposalBtnNeto',
        'addProposalBtnWandreyna',
        'addProposalBtnEder',
        'addProposalBtnSuzana'
    ];

    proposalButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                if (window.adminDashboard) {
                    window.adminDashboard.openAddProposalModal();
                }
            });
        }
    });

    // Botões de gestão de especialistas
    document.getElementById('addSpecialistBtn')
        ?.addEventListener('click', () => window.adminDashboard.openAddSpecialistModal());
    document.getElementById('deleteSpecialistBtn')
        ?.addEventListener('click', () => window.adminDashboard.openDeleteSpecialistModal());

    // Carrega especialistas dinâmicos salvos no banco
    window.adminDashboard.loadDynamicSpecialists();
});

// Verificação de Conexão
setInterval(async () => {
    if (!window.navigator.onLine) {
        if (typeof showOfflineScreen === 'function') showOfflineScreen();
        return;
    }
    try {
        await fetch('https://administradores.ccapi.com.br/favicon.ico', { 
            mode: 'no-cors',
            cache: 'no-store' 
        });
    } catch (error) {
        console.log("Servidor inacessível");
        if (typeof showOfflineScreen === 'function') showOfflineScreen();
    }
}, 10000);

// ============ MÁSCARAS E FORMATAÇÃO ============
function formatMoney(input) {
    let value = input.value.replace(/\D/g, '');
    value = (value / 100).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + value;
}

function formatDocument(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    input.value = value;
}

function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        value = value.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    }
    input.value = value;
}

function formatCEP(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = value.replace(/(\d{5})(\d)/, '$1-$2');
}

// --- FUNÇÕES DE SUPORTE ---
AdminDashboard.prototype.accessSupport = function(profile) {
    let password = '';
    if (profile === 'administrador') {
        password = prompt('Digite a senha de Administrador:');
        if (password !== 'suporte1281') {
            alert('Senha incorreta!');
            return;
        }
    } else if (profile === 'suporte') {
        password = prompt('Digite a senha de Suporte Técnico:');
        if (password !== 'Suporte@1281') {
            alert('Senha incorreta!');
            return;
        }
    }

    this.supportProfile = profile;
    document.getElementById('supportAccessContainer').style.display = 'none';
    document.getElementById('supportChatContainer').style.display = 'block';
    document.getElementById('supportChatTitle').innerText = `Suporte - Perfil: ${profile.charAt(0).toUpperCase() + profile.slice(1)}`;
    
    this.loadSupportMessages();
    if (this.supportInterval) clearInterval(this.supportInterval);
    this.supportInterval = setInterval(() => this.loadSupportMessages(), 5000);
};

AdminDashboard.prototype.exitSupport = function() {
    document.getElementById('supportAccessContainer').style.display = 'grid';
    document.getElementById('supportChatContainer').style.display = 'none';
    if (this.supportInterval) clearInterval(this.supportInterval);
};

AdminDashboard.prototype.loadSupportMessages = async function() {
    try {
        const response = await fetch(`${this.apiEndpoint}?action=get_support_messages`);
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('supportMessages');
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            
            container.innerHTML = data.data.map(msg => {
                const isMe = msg.sender_id == this.user.id;
                const date = new Date(msg.created_at);
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // Lógica de visibilidade: Admin vê tudo, Especialista vê só suporte, Suporte vê tudo
                let visible = true;
                if (this.supportProfile === 'especialista' && msg.sender_type === 'especialista' && !isMe) {
                    visible = false; // Especialistas não se veem entre si no chat global
                }
                
                if (!visible) return '';

                return `
                    <div class="chat-message ${isMe ? 'sent' : 'received'}">
                        <span class="sender-name">${msg.sender_name} <small>(${msg.sender_type})</small></span>
                        <div class="message-text">${msg.message}</div>
                        <span class="message-time">${timeStr}</span>
                    </div>
                `;
            }).join('');

            if (isAtBottom) container.scrollTop = container.scrollHeight;
        }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
};

AdminDashboard.prototype.sendSupportMessage = async function() {
    const input = document.getElementById('supportMessageInput');
    const message = input.value.trim();
    if (!message) {
        this.showNotification('Digite uma mensagem', 'warning');
        return;
    }

    try {
        const payload = {
            sender_id: this.user.id || 0,
            sender_name: this.user.name || 'Usuario',
            sender_type: this.supportProfile || 'suporte',
            message: message
        };
        
        console.log('Enviando mensagem:', payload);
        
        const response = await fetch(`${this.apiEndpoint}?action=send_support_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta do servidor:', data);
        
        if (data.success) {
            input.value = '';
            input.style.height = 'auto';
            this.showNotification('Mensagem enviada com sucesso', 'success');
            setTimeout(() => this.loadSupportMessages(), 300);
        } else {
            this.showNotification('Erro: ' + (data.message || 'Falha ao enviar mensagem'), 'error');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        this.showNotification('Erro ao enviar mensagem: ' + error.message, 'error');
    }
};

AdminDashboard.prototype.toggleChatInfo = function() {
    this.showNotification('Informacoes do Chat: Perfil ' + this.supportProfile.toUpperCase(), 'info');
};

AdminDashboard.prototype.toggleEmojiPicker = function() {
    this.showNotification('Emoji picker em desenvolvimento', 'info');
};

AdminDashboard.prototype.searchConversations = function() {
    const searchInput = document.getElementById('supportSearchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const conversationItems = document.querySelectorAll('.conversation-item');
    
    conversationItems.forEach(item => {
        const name = item.querySelector('.conversation-item-name').textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
};

function formatPlate(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 3) value = value.substring(0, 3) + '-' + value.substring(3, 7);
    input.value = value;
}

document.addEventListener('DOMContentLoaded', () => {
    const moneyFields = ['newClientIncome', 'newVehicleValue', 'newFinanceValue', 'newFinanceEntry'];
    moneyFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', () => formatMoney(field));
            field.addEventListener('focus', function() {
                if (this.value === '' || this.value === 'R$ 0,00') this.value = 'R$ ';
            });
        }
    });

    const masks = [
        { id: 'newClientCPF', fn: formatDocument },
        { id: 'newClientCNPJ', fn: formatDocument },
        { id: 'newClientPhone', fn: formatPhone },
        { id: 'newClientCep', fn: formatCEP },
        { id: 'newVehiclePlate', fn: formatPlate }
    ];
    masks.forEach(m => {
        const field = document.getElementById(m.id);
        if (field) field.addEventListener('input', () => m.fn(field));
    });

    // Adicionar suporte para enviar mensagem de suporte com Enter
    const supportInput = document.getElementById('supportMessageInput');
    if (supportInput) {
        supportInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (typeof adminDashboard !== 'undefined') {
                    adminDashboard.sendSupportMessage();
                }
            }
        });
        
        // Auto-resize textarea
        supportInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }
});


// ============ FUNÇÕES ADICIONAIS DE SUPORTE ============

AdminDashboard.prototype.filterSupportMessages = function() {
    const container = document.getElementById('supportMessages');
    if (!container) return;
    
    const filterSelect = document.getElementById('supportFilterType');
    const filter = filterSelect ? filterSelect.value : 'all';
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    
    let filteredMessages = this.supportMessages || [];
    if (filter !== 'all') {
        filteredMessages = filteredMessages.filter(msg => msg.sender_type === filter);
    }
    
    if (filteredMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>Nenhuma mensagem encontrada</p>
                <small>Comece uma conversa enviando uma mensagem</small>
            </div>
        `;
    } else {
        container.innerHTML = filteredMessages.map(msg => {
            const isMe = msg.sender_id == this.user.id;
            const date = new Date(msg.created_at);
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            let visible = true;
            if (this.supportProfile === 'especialista' && msg.sender_type === 'especialista' && !isMe) {
                visible = false;
            }
            
            if (!visible) return '';

            return `
                <div class="chat-message ${isMe ? 'sent' : 'received'}">
                    <span class="sender-name">${this.escapeHtml(msg.sender_name)} <small>(${msg.sender_type})</small></span>
                    <div class="chat-message-content">
                        <div class="message-text">${this.escapeHtml(msg.message)}</div>
                        <span class="message-time">${timeStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    const countElement = document.getElementById('messageCount');
    if (countElement) countElement.innerText = filteredMessages.length;
    
    if (isAtBottom) container.scrollTop = container.scrollHeight;
};

AdminDashboard.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/* ============ MÉTODOS DO PAINEL DE METAS (GAME STYLE) ============ */
Object.assign(AdminDashboard.prototype, {
  openPainelGame() {
    const overlay = document.getElementById('painelOverlay');
    overlay.style.display = 'block';
    
    // Inicializar zoom em 100%
    this.painelZoom = 100;
    overlay.style.transform = 'scale(1)';
    overlay.style.transformOrigin = 'top center';
    
    // Controles de zoom removidos conforme solicitação
    
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        console.log('Tela cheia não disponível (modo Tauri)');
      });
    }
    this.loadPainelBank('santander');
    
    // Auto-refresh a cada 30 segundos
    if (this.painelInterval) clearInterval(this.painelInterval);
    this.painelInterval = setInterval(() => {
      if (document.getElementById('painelOverlay').style.display === 'block') {
        const activeBank = document.querySelector('.game-bank-btn.active')?.dataset.bank;
        if (activeBank) this.loadPainelBank(activeBank);
      }
    }, 30000);
  },

  adjustPainelZoom(delta) {
    this.painelZoom = Math.max(50, Math.min(200, this.painelZoom + delta));
    const overlay = document.getElementById('painelOverlay');
    const scale = this.painelZoom / 100;
    overlay.style.transform = `scale(${scale})`;
    document.getElementById('painelZoomValue').textContent = this.painelZoom + '%';
  },

  resetPainelZoom() {
    this.painelZoom = 100;
    const overlay = document.getElementById('painelOverlay');
    overlay.style.transform = 'scale(1)';
    document.getElementById('painelZoomValue').textContent = '100%';
  },

  closePainelGame() {
    document.getElementById('painelOverlay').style.display = 'none';
    if (this.painelInterval) clearInterval(this.painelInterval);
    
    // Remoção de controles de zoom não necessária (removidos da inicialização)
    
    // Resetar zoom
    this.resetPainelZoom();
    
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        console.log('Saída de tela cheia não disponível');
      });
    }
  },

  shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  },

  async loadPainelBank(bank) {
    try {
      document.getElementById('painelOverlay').setAttribute('data-theme', bank);
      
      document.querySelectorAll('.game-bank-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.bank === bank) btn.classList.add('active');
      });

      const bankInfo = {
        santander: { name: 'SANTANDER', logo: 'SANTANDER.png' },
        bv: { name: 'BV', logo: 'IMG/banco-bv-logo' },
        omni: { name: 'OMNI', logo: 'IMG/omni-banco-financeira-logo.png' },
        c6: { name: 'C6', logo: 'IMG/c6-banco logo.png' },
        itau: { name: 'ITAÚ', logo: 'IMG/itau-logo-0.png' },
        pan: { name: 'PAN', logo: 'IMG/banco-pan-logo.jfif.png' }
      };

      document.getElementById('gameBankTitle').textContent = bankInfo[bank].name;
      const logoContainer = document.getElementById('gameBankLogoContainer');
      if (logoContainer) {
        logoContainer.innerHTML = `<img id="gameBankLogo" src="${bankInfo[bank].logo}" alt="Logo Banco" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3));">`;
        logoContainer.style.background = 'transparent';
        logoContainer.style.boxShadow = 'none';
      }

      const response = await fetch(`${this.apiEndpoint}?action=get_proposals_by_bank&bank=${bank}`);
      const data = await response.json();

      if (data.success) {
        const proposals = data.data.proposals || [];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const monthProposals = proposals.filter(p => {
          // Status deve ser formalizada (case insensitive)
          if (p.status?.toLowerCase() !== 'formalizada') return false;
          
          if (!p.data_proposta) return false;
          
          // Tratar data (YYYY-MM-DD)
          const dateParts = p.data_proposta.split('-');
          if (dateParts.length !== 3) return false;
          
          const pYear = parseInt(dateParts[0]);
          const pMonth = parseInt(dateParts[1]);
          
          return (pMonth === currentMonth && pYear === currentYear);
        });

        // Normalizar nomes para evitar problemas com acentos
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        
        const counts = { 'fabricio': 0, 'neto': 0, 'wandreyna': 0, 'eder': 0, 'suzana': 0 };
        const originalNames = { 'fabricio': 'Fabrício', 'neto': 'Neto', 'wandreyna': 'Wandreyna', 'eder': 'Éder', 'suzana': 'Suzana' };
        
        monthProposals.forEach(p => {
          const specNormalized = normalize(p.specialist || '');
          if (counts.hasOwnProperty(specNormalized)) {
            counts[specNormalized]++;
          }
        });

        document.getElementById('gameTotalValue').textContent = monthProposals.length;
        
        // Converter de volta para nomes originais para o render
        const finalCounts = {};
        Object.keys(counts).forEach(key => {
          finalCounts[originalNames[key]] = counts[key];
        });

        this.renderGameStyle(finalCounts);
      }
    } catch (error) {
      console.error("Erro no painel:", error);
    }
  },

  renderGameStyle(counts) {
    const row = document.getElementById('gameSpecialistsRow');
    const rankingList = document.getElementById('gameRankingList');
    row.innerHTML = '';
    rankingList.innerHTML = '';

    const specialists = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const fixedOrder = ['Fabrício', 'Neto', 'Wandreyna', 'Éder', 'Suzana'];
    fixedOrder.forEach(name => {
      const count = counts[name] || 0;
      
      const card = document.createElement('div');
      card.className = 'game-card';
      
      // Mapeamento de fotos (caso existam no futuro)
      const photoMap = {
        'Fabrício': 'IMG/fabricio.png',
        'Neto': 'IMG/neto.png',
        'Wandreyna': 'IMG/wandreyna.png',
        'Éder': 'IMG/eder.png',
        'Suzana': 'IMG/suzana.png'
      };
      
      const photoSrc = photoMap[name];
      
      card.innerHTML = `
        <div class="game-card-head">
          <i class="fas fa-user"></i>
          <!-- <img src="${photoSrc}" alt="${name}" onerror="this.style.display='none'"> -->
        </div>
        <h3>${name}</h3>
        <div class="game-card-count">${count}</div>
      `;
      row.appendChild(card);
    });

    specialists.forEach((spec, index) => {
      const item = document.createElement('div');
      item.className = 'game-ranking-item';
      item.innerHTML = `
        <div class="game-rank-num">${index + 1}</div>
        <div class="game-ranking-name" style="flex:1;">${spec[0]}</div>
        <div class="game-ranking-val">${spec[1]}</div>
      `;
      rankingList.appendChild(item);
    });
  },

  // NOVA FUNÇÃO: Abrir modal de relatório
  openReportModal() {
    const reportModal = document.getElementById('reportModal');
    const reportYear = document.getElementById('reportYear');
    
    if (!reportModal) {
      this.showNotification('Modal de relatório não encontrado', 'error');
      return;
    }

    // Popular anos no select
    if (reportYear && reportYear.options.length <= 2) {
      const currentYear = new Date().getFullYear();
      for (let i = 0; i <= 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        reportYear.appendChild(option);
      }
    }

    reportModal.style.display = 'flex';
  },

  // NOVA FUNÇÃO: Fechar modal de relatório
  closeReportModal() {
    const reportModal = document.getElementById('reportModal');
    if (reportModal) {
      reportModal.style.display = 'none';
    }
  },

  // NOVA FUNÇÃO: Gerar relatório
  async generateReport() {
    const year = document.getElementById('reportYear')?.value;
    const month = document.getElementById('reportMonth')?.value;
    const specialist = document.getElementById('reportSpecialist')?.value;
    const format = document.querySelector('input[name="reportFormat"]:checked')?.value || 'pdf';

    if (!year || !month || !specialist) {
      this.showNotification('Por favor, preencha todos os campos', 'error');
      return;
    }

    this.showNotification('Buscando dados do relatório...', 'info');

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_report',
          year: year === 'all' ? '' : year,
          month: month === 'all' ? '' : month,
          specialist: specialist === 'all' ? '' : specialist,
          format: format
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao obter dados do relatório');
      }

      const { proposals, stats, login_activity, filters, generated_at } = data.data;

      if (!proposals || proposals.length === 0) {
        this.showNotification('Nenhuma proposta encontrada para os filtros selecionados', 'warning');
        return;
      }

      if (format === 'pdf') {
        this.generateReportPDF(proposals, stats, login_activity, filters, generated_at);
      } else {
        this.generateReportExcel(proposals, stats, filters, generated_at);
      }

      this.closeReportModal();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.showNotification('Erro ao gerar relatório: ' + error.message, 'error');
    }
  },

  /**
   * Gera o PDF do relatório client-side com gráficos e totais
   */
  async generateReportPDF(proposals, stats, loginActivity, filters, generatedAt) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4'); // Retrato para relatório executivo
      const margin = 10;
      let y = 20;

      // --- PÁGINA 1: RESUMO EXECUTIVO ---
      // Cabeçalho
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE PROPOSTAS CCAPI", 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${generatedAt}`, 105, 33, { align: 'center' });

      y = 55;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMO FINANCEIRO", 105, y, { align: 'center' });
      y += 10;

      // Cards de Totais
      const drawCard = (label, value, x, y, width, height, color) => {
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, width, height, 2, 2, 'FD');
        doc.setFillColor(color);
        doc.rect(x, y, 2, height, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + 6, y + 8);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(value, x + 6, y + 18);
      };

      const formatBRL = (val) => Number.parseFloat(val).toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' });

      const cardWidth = 55;
      const totalWidth = (cardWidth * 3) + 14;
      const startX = (210 - totalWidth) / 2;
      drawCard("TOTAL DE PROPOSTAS", String(stats.total_count), startX, y, cardWidth, 25, "#3b82f6");
      drawCard("VALOR TOTAL", formatBRL(stats.total_value), startX + cardWidth + 7, y, cardWidth, 25, "#8b5cf6");
      drawCard("FORMALIZADAS", formatBRL(stats.formalized_value), startX + (cardWidth * 2) + 14, y, cardWidth, 25, "#10b981");

      y += 35;

      // Tabela de Especialistas Centralizada
      doc.setFontSize(14);
      doc.text("DESEMPENHO POR ESPECIALISTA", 105, y, { align: 'center' });
      y += 8;

      const tableWidth = 180;
      const tableX = (210 - tableWidth) / 2;
      doc.setFillColor(241, 245, 249);
      doc.rect(tableX, y - 5, tableWidth, 8, 'F');
      doc.setFontSize(9);
      doc.text("Especialista", tableX + 2, y);
      doc.text("Qtd", tableX + 60, y);
      doc.text("Valor Total", tableX + 90, y);
      doc.text("Formalizado", tableX + 140, y);
      y += 8;
      doc.setFont("helvetica", "normal");

      Object.entries(stats.by_specialist).forEach(([name, s]) => {
        doc.text(name, tableX + 2, y);
        doc.text(String(s.count), tableX + 60, y);
        doc.text(formatBRL(s.value), tableX + 90, y);
        doc.setTextColor(16, 185, 129);
        doc.text(formatBRL(s.formalized_value), tableX + 140, y);
        doc.setTextColor(30, 41, 59);
        y += 7;
      });

      y += 10;

      // Atividade de Login
      if (loginActivity && loginActivity.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("ATIVIDADE DOS ESPECIALISTAS", margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        loginActivity.forEach(log => {
          const loginDate = log.last_login ? new Date(log.last_login).toLocaleString('pt-BR') : 'Sem registro';
          doc.text(`${log.name} (${log.user_type}): Último acesso em ${loginDate}`, margin, y);
          y += 6;
        });
      }

      // --- PÁGINA 2 EM DIANTE: LISTAGEM DETALHADA ---
      doc.addPage('l', 'a4'); // Muda para paisagem para a tabela longa
      y = 20;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LISTAGEM DETALHADA DE PROPOSTAS", margin, y);
      y += 12;

      const cols = {
        id: { x: margin + 0, label: 'ID' },
        cliente: { x: margin + 10, label: 'Cliente' },
        especialista: { x: margin + 90, label: 'Especialista' },
        banco: { x: margin + 130, label: 'Banco' },
        status: { x: margin + 165, label: 'Status' },
        valor: { x: margin + 205, label: 'Valor' }
      };

      const drawTableHeader = (yPos) => {
        doc.setFillColor(37, 99, 235);
        doc.rect(margin, yPos - 5, 277, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        Object.values(cols).forEach(col => doc.text(col.label, col.x, yPos));
      };

      drawTableHeader(y);
      y += 8;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");

      proposals.forEach((prop, index) => {
        if (y > 185) {
          doc.addPage('l');
          y = 25;
          drawTableHeader(y);
          y += 8;
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "normal");
        }

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 5, 267, 7, 'F');
        }

        doc.text(String(prop.id), cols.id.x, y);
        doc.text(String(prop.client_name || 'N/A').substring(0, 45), cols.cliente.x, y);
        doc.text(String(prop.specialist || 'N/A'), cols.especialista.x, y);
        doc.text(String(prop.bank_name || 'N/A'), cols.banco.x, y);
        doc.text(String(this.getStatusText(prop.status)), cols.status.x, y);
        doc.text(formatBRL(prop.finance_value || 0), cols.valor.x, y);
        y += 7;
      });

      // Salvar
      const fileName = `Relatorio_Completo_CCAPI_${new Date().getTime()}.pdf`;
      if (window.__TAURI__) {
        this.tauriDownloadPDF(doc, fileName);
      } else {
        doc.save(fileName);
        this.showNotification("PDF aprimorado gerado com sucesso!", "success");
      }
    } catch (error) {
      console.error("Erro ao gerar PDF do relatório:", error);
      this.showNotification("Erro ao processar PDF", "error");
    }
  },

  /**
   * Gera o Excel do relatório (formato CSV otimizado para Excel)
   */
  async generateReportExcel(proposals, stats, filters, generatedAt) {
    try {
      // Ordenar propostas por nome do cliente em ordem alfabética
      const sortedProposals = [...proposals].sort((a, b) => 
        (a.client_name || '').localeCompare(b.client_name || '', 'pt-BR')
      );

      // Gerar XML Spreadsheet 2003 para suportar formatação (bordas, cores, larguras)
      let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:microsoft"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#166534" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <NumberFormat ss:Format="Standard"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Color="#166534" ss:Bold="1"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Relatorio">
  <Table>
   <Column ss:Width="40"/>
   <Column ss:Width="80"/>
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   
   <Row ss:Height="25">
    <Cell ss:StyleID="Title"><Data ss:Type="String">RELATÓRIO DE PROPOSTAS CCAPI</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Gerado em: ${generatedAt}</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">ID</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DATA</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">CLIENTE</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">DOCUMENTO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ESPECIALISTA</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">BANCO</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">STATUS</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">VALOR</Data></Cell>
   </Row>`;

      sortedProposals.forEach(prop => {
        const dataObj = new Date(prop.created_at);
        const dataFormatada = `${String(dataObj.getDate()).padStart(2, '0')}/${String(dataObj.getMonth() + 1).padStart(2, '0')}/${dataObj.getFullYear()}`;
        const valor = Number.parseFloat(prop.finance_value || 0);
        const status = this.getStatusText(prop.status);
        const documento = prop.client_cpf || prop.client_cnpj || 'N/A'; // Priorizar CPF, depois CNPJ

        xml += `
   <Row>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${prop.id}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${dataFormatada}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${this.escapeXml(prop.client_name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${this.escapeXml(documento)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${this.escapeXml(prop.specialist)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${this.escapeXml(prop.bank_name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${this.escapeXml(status)}</Data></Cell>
    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${valor}</Data></Cell>
   </Row>`;
      });

      xml += `
  </Table>
 </Worksheet>
</Workbook>`;

      const fileName = `Relatorio_CCAPI_${new Date().getTime()}.xls`;

      if (window.__TAURI__) {
        // No Tauri, escreve direto via fs sem precisar de blob URL (que pode falhar no webview)
        try {
          const { save } = window.__TAURI__.dialog;
          const { writeFile } = window.__TAURI__.fs;
          const encoder = new TextEncoder();
          const xmlBytes = encoder.encode(xml);
          const outputPath = await save({
            filters: [{ name: 'Excel', extensions: ['xls'] }],
            defaultPath: fileName
          });
          if (outputPath) {
            await writeFile(outputPath, xmlBytes);
            this.showNotification('Relatorio Excel salvo com sucesso!', 'success');
          }
        } catch (err) {
          console.error('Erro ao salvar Excel via Tauri:', err);
          this.showNotification('Erro ao salvar o arquivo Excel', 'error');
        }
      } else {
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.showNotification("Relatorio Excel gerado com sucesso!", "success");
      }
    } catch (error) {
      console.error("Erro ao gerar Excel do relatório:", error);
      this.showNotification("Erro ao processar Excel", "error");
    }
  },

  escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&"']/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
  },

  /**
   * Helper para download de PDF via Tauri
   */
  async tauriDownloadPDF(doc, fileName) {
    try {
      const { save } = window.__TAURI__.dialog;
      const { writeFile } = window.__TAURI__.fs;
      const pdfOutput = doc.output('arraybuffer');
      
      const outputPath = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: fileName
      });
      
      if (outputPath) {
        await writeFile(outputPath, new Uint8Array(pdfOutput));
        this.showNotification("Relatório salvo com sucesso!", "success");
      }
    } catch (err) {
      console.error("Erro ao salvar PDF via Tauri:", err);
      this.showNotification("Erro ao salvar o arquivo", "error");
    }
  },
  
  // Substitua a sua função openCNPJConsultation por esta:
  async openCNPJConsultation(cnpj) {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const consultaURL = `https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=${cleanCNPJ}`;
    
    this.showNotification('Abrindo consulta CNPJ...', 'info');

    try {
      // Padrão Tauri v2 para criar janela independente
      if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
        const { WebviewWindow } = window.__TAURI__.webviewWindow;
        new WebviewWindow('janela-cnpj', {
          url: consultaURL,
          title: 'Receita Federal - CNPJ',
          width: 1000,
          height: 800,
          resizable: true,
          center: true
        });
      } else {
        window.open(consultaURL, '_blank');
      }
    } catch (err) {
      window.open(consultaURL, '_blank');
    }
  },

  // Substitua a sua função openCPFConsultation por esta:
  async openCPFConsultation(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    const consultaURL = 'https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp';
    
    this.showNotification('Abrindo consulta CPF...', 'info');

    try {
      // Padrão Tauri v2 para criar janela independente
      if (window.__TAURI__ && window.__TAURI__.webviewWindow) {
        const { WebviewWindow } = window.__TAURI__.webviewWindow;
        new WebviewWindow('janela-cpf', {
          url: consultaURL,
          title: 'Receita Federal - CPF',
          width: 1000,
          height: 800,
          resizable: true,
          center: true
        });
      } else {
        window.open(consultaURL, '_blank');
      }
    } catch (err) {
      window.open(consultaURL, '_blank');
    }
  },
  // NOVA FUNÇÃO: Abrir modal de confirmação de exclusão de proposta
  openDeleteProposalModal(proposalId, clientName) {
    // Apenas administradores podem excluir
    if (this.user.user_type.toLowerCase() !== 'administrador') {
      this.showNotification('Apenas administradores podem excluir propostas', 'error');
      return;
    }

    this.currentProposalId = proposalId;
    const deleteModal = document.getElementById('deleteProposalModal');
    const deleteClientName = document.getElementById('deleteClientName');
    const deletePassword = document.getElementById('deleteProposalPassword');

    if (deleteModal && deleteClientName && deletePassword) {
      deleteClientName.textContent = clientName;
      deletePassword.value = '';
      deleteModal.style.display = 'flex';
    }
  },

  // NOVA FUNÇÃO: Fechar modal de exclusão de proposta
  closeDeleteProposalModal() {
    const deleteModal = document.getElementById('deleteProposalModal');
    if (deleteModal) {
      deleteModal.style.display = 'none';
      document.getElementById('deleteProposalPassword').value = '';
    }
  },

  // NOVA FUNÇÃO: Confirmar exclusão de proposta com validação de senha
  async confirmDeleteProposal() {
    const password = document.getElementById('deleteProposalPassword')?.value;
    const ADMIN_PASSWORD = 'Suporte@1281'; // Senha padrão

    if (!password) {
      this.showNotification('Por favor, digite a senha', 'error');
      return;
    }

    if (password !== ADMIN_PASSWORD) {
      this.showNotification('Senha incorreta!', 'error');
      return;
    }

    if (!this.currentProposalId) {
      this.showNotification('Erro: ID da proposta não encontrado', 'error');
      return;
    }

    this.showNotification('Excluindo proposta...', 'info');

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_proposal',
          proposal_id: parseInt(this.currentProposalId)
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showNotification('Proposta excluída com sucesso!', 'success');
        this.closeDeleteProposalModal();
        
        // Fechar o modal de detalhes se estiver aberto
        const proposalModal = document.getElementById('proposalModal');
        if (proposalModal) {
          proposalModal.style.display = 'none';
        }
        
        // Recarregar lista de propostas
        await this.loadDashboardData();
        
        // Se estiver na seção de especialista, recarregar também
        const userType = this.normalizeUserType(this.user.user_type);
        if (userType !== 'administrador' && this.currentSection !== 'overview') {
          await this.loadSpecialistProposals(this.currentSection);
        }
      } else {
        this.showNotification(data.error || 'Erro ao excluir proposta', 'error');
      }
    } catch (error) {
      console.error('Erro ao excluir proposta:', error);
      this.showNotification('Erro ao processar exclusão da proposta', 'error');
    }
  }
  
}); // Fim do Object.assign

// instância única criada pelo DOMContentLoaded