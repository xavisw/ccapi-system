// ================================================
// SISTEMA DE TUTORIAL INTERATIVO - ISSO AQUI É DO APP

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.steps = [
            {
                target: '#themeToggleBtn',
                title: '🎨 Tema Claro/Escuro',
                description: 'Alterne entre o tema claro e escuro para melhor conforto visual. Escolha o que mais combina com você!',
                position: 'bottom'
            },
            {
                target: '#dashboardSidebar .dashboard-menu',
                title: '📋 Menu de Navegação',
                description: 'Este é o menu principal do dashboard. Aqui você encontra todas as funcionalidades disponíveis para gerenciar seus financiamentos.',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="overview"]',
                title: '🏠 Início - Visão Geral',
                description: 'A tela inicial mostra um resumo completo: propostas ativas, simulações, estatísticas e acesso rápido às principais funções.',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="simulation"]',
                title: '🧮 Simulação de Financiamento',
                description: 'Simule seu financiamento de forma rápida e fácil! Insira os valores e veja as parcelas, juros e condições disponíveis.',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="new-proposal"]',
                title: '📝 Nova Proposta',
                description: 'Crie uma nova proposta de financiamento. Preencha os dados do cliente, veículo e condições desejadas para enviar.',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="proposals"]',
                title: '📊 Minhas Propostas',
                description: 'Acompanhe todas as suas propostas em um só lugar: pendentes, aprovadas, rejeitadas. Veja o status em tempo real!',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="financial-health"]',
                title: '💚 Saúde Financeira',
                description: 'Verifique sua capacidade de pagamento! Calcule o percentual de comprometimento da renda e saiba se o financiamento cabe no seu bolso.',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="payment-timeline"]',
                title: '📅 Linha de Tempo',
                description: 'Descubra quanto tempo você levará para quitar o financiamento e quanto pode economizar pagando mais por mês!',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="chats"]',
                title: '💬 Chat com Especialistas',
                description: 'Precisa de ajuda? Converse diretamente com nossa equipe de especialistas. Tire dúvidas e receba orientações personalizadas!',
                position: 'right',
                requiresSidebar: true
            },
            {
                target: '[data-section="tutorial"]',
                title: '🎓 Tutorial',
                description: 'A qualquer momento você pode refazer este tutorial clicando aqui. Estamos aqui para ajudar você!',
                position: 'right',
                requiresSidebar: true
            }
        ];
    }

    isFirstAccess() {
        return !localStorage.getItem('tutorialCompleted');
    }

    markAsCompleted() {
        localStorage.setItem('tutorialCompleted', 'true');
    }

    reset() {
        localStorage.removeItem('tutorialCompleted');
        this.currentStep = 0;
    }

    start() {
        if (this.isActive) return;
        
        const dashboard = document.querySelector('.dashboard');
        if (!dashboard || !dashboard.classList.contains('active')) {
            if (typeof showNotification === 'function') {
                showNotification('Abra o dashboard primeiro para iniciar o tutorial', 'warning');
            }
            return;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.showStep(0);
    }

    showStep(step) {
        if (step < 0 || step >= this.steps.length) {
            this.finish();
            return;
        }

        this.currentStep = step;
        const currentStepData = this.steps[step];

        if (currentStepData.requiresSidebar && window.innerWidth <= 768) {
            const sidebar = document.getElementById('dashboardSidebar');
            const overlay = document.getElementById('dashboardSidebarOverlay');
            if (sidebar && !sidebar.classList.contains('active')) {
                sidebar.classList.add('active');
                if (overlay) overlay.classList.add('active');
            }
        }

        setTimeout(() => {
            const target = document.querySelector(currentStepData.target);
            if (!target) {
                console.warn(`Elemento não encontrado: ${currentStepData.target}`);
                this.nextStep();
                return;
            }

            this.removeTutorialElements();
            this.createOverlay();
            this.highlightElement(target);
            this.showTooltip(target, currentStepData);
        }, 100);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.id = 'tutorialOverlay';
        document.body.appendChild(overlay);
    }

    highlightElement(element) {
        const rect = element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'tutorial-highlight';
        highlight.id = 'tutorialHighlight';
        
        const padding = 8;
        highlight.style.top = `${rect.top - padding}px`;
        highlight.style.left = `${rect.left - padding}px`;
        highlight.style.width = `${rect.width + (padding * 2)}px`;
        highlight.style.height = `${rect.height + (padding * 2)}px`;
        highlight.style.borderRadius = window.getComputedStyle(element).borderRadius || '8px';
        
        document.body.appendChild(highlight);
        
        setTimeout(() => {
            highlight.style.opacity = '1';
        }, 10);
    }

    showTooltip(element, stepData) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tutorial-tooltip';
        tooltip.id = 'tutorialTooltip';
        
        const isMobile = window.innerWidth <= 768;
        
        tooltip.innerHTML = `
            <div class="tutorial-tooltip-header">
                <h3 class="tutorial-tooltip-title">${stepData.title}</h3>
                <button class="tutorial-close-btn" onclick="tutorialSystem.skip()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="tutorial-tooltip-body">
                <p class="tutorial-tooltip-description">${stepData.description}</p>
            </div>
            <div class="tutorial-tooltip-footer">
                <span class="tutorial-step-counter">${this.currentStep + 1} de ${this.steps.length}</span>
                <div class="tutorial-tooltip-actions">
                    ${this.currentStep > 0 ? '<button class="btn btn-sm btn-secondary" onclick="tutorialSystem.previousStep()"><i class="fas fa-arrow-left"></i> Anterior</button>' : ''}
                    ${this.currentStep < this.steps.length - 1 ? '<button class="btn btn-sm btn-primary" onclick="tutorialSystem.nextStep()">Próximo <i class="fas fa-arrow-right"></i></button>' : '<button class="btn btn-sm btn-success" onclick="tutorialSystem.finish()"><i class="fas fa-check"></i> Concluir</button>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            this.positionTooltip(tooltip, element, stepData.position, isMobile);
        }, 10);
    }

    positionTooltip(tooltip, element, position, isMobile) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;
        
        if (isMobile) {
            // CORREÇÃO MOBILE: Centralizar tooltip e garantir visibilidade dos botões
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Centralizar horizontalmente
            left = (viewportWidth - tooltipRect.width) / 2;
            
            // Posicionar verticalmente com margem segura
            const safeMarginTop = 80; // Espaço do topo (header + margem)
            const safeMarginBottom = 30; // Espaço do fundo
            
            // Calcular posição ideal: abaixo do elemento destacado
            top = rect.bottom + 20;
            
            // Se não couber abaixo, colocar acima
            if (top + tooltipRect.height > viewportHeight - safeMarginBottom) {
                top = rect.top - tooltipRect.height - 20;
            }
            
            // Se ainda não couber, centralizar verticalmente
            if (top < safeMarginTop || top + tooltipRect.height > viewportHeight - safeMarginBottom) {
                top = (viewportHeight - tooltipRect.height) / 2;
            }
            
            // Garantir que não saia dos limites
            top = Math.max(safeMarginTop, Math.min(top, viewportHeight - tooltipRect.height - safeMarginBottom));
            left = Math.max(15, Math.min(left, viewportWidth - tooltipRect.width - 15));
        } else {
            // DESKTOP: Posicionamento original
            const padding = 20;
            
            switch (position) {
                case 'bottom':
                    top = rect.bottom + padding;
                    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
                    left = rect.right + padding;
                    break;
                default:
                    top = rect.bottom + padding;
                    left = rect.left;
            }

            const margin = 20;
            const maxLeft = window.innerWidth - tooltipRect.width - margin;
            left = Math.max(margin, Math.min(left, maxLeft));

            if (top + tooltipRect.height > window.innerHeight - margin) {
                top = rect.top - tooltipRect.height - padding;
            }
            if (top < margin) {
                top = rect.bottom + padding;
            }
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'scale(1)';
    }

    removeTutorialElements() {
        const overlay = document.getElementById('tutorialOverlay');
        const highlight = document.getElementById('tutorialHighlight');
        const tooltip = document.getElementById('tutorialTooltip');
        
        if (overlay) overlay.remove();
        if (highlight) highlight.remove();
        if (tooltip) tooltip.remove();
    }

    nextStep() { if (this.currentStep < this.steps.length - 1) this.showStep(this.currentStep + 1); }
    previousStep() { if (this.currentStep > 0) this.showStep(this.currentStep - 1); }
    skip() { if (confirm('Pular tutorial?')) this.finish(); }

    finish() {
        this.isActive = false;
        this.markAsCompleted();
        this.removeTutorialElements();
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('dashboardSidebar');
            const overlay = document.getElementById('dashboardSidebarOverlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }
        if (typeof showNotification === 'function') showNotification('✅ Tour concluído!', 'success');
    }

    showWelcomeModal() {
        const modal = document.createElement('div');
        modal.id = 'tutorialWelcomeModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content tutorial-welcome-content">
                <div class="tutorial-welcome-header">
                    <div class="tutorial-welcome-icon" style="width:70px; height:70px; background:linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px; color:white; font-size:30px;">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <h2 style="font-size:22px; margin-bottom:10px;">Bem-vindo! 🚀</h2>
                </div>
                <div class="modal-body" style="padding:0;">
                    <p style="font-size:15px; color:#64748b; margin-bottom:20px;">
                        Vamos conhecer as ferramentas do seu novo dashboard? É rapidinho!
                    </p>
                </div>
                <div class="tutorial-welcome-actions" style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn btn-outline btn-sm" onclick="tutorialSystem.declineWelcome()">Agora não</button>
                    <button class="btn btn-primary btn-sm" onclick="tutorialSystem.acceptWelcome()">Começar Tour</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    }

    acceptWelcome() {
        const modal = document.getElementById('tutorialWelcomeModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
        this.start();
    }

    declineWelcome() {
        const modal = document.getElementById('tutorialWelcomeModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
        this.markAsCompleted();
    }
}

const tutorialSystem = new TutorialSystem();
document.addEventListener('DOMContentLoaded', () => {
    const startTutorialBtn = document.getElementById('startTutorialBtn');
    if (startTutorialBtn) startTutorialBtn.addEventListener('click', () => { tutorialSystem.reset(); tutorialSystem.start(); });
});
window.tutorialSystem = tutorialSystem;