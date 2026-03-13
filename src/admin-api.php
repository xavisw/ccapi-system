<?php
// API para o painel administrativo
// ===== CORREÇÃO CRÍTICA: Output Buffering =====
// Removido ob_start global para evitar problemas com downloads binários.
// O buffer será controlado localmente em cada resposta.
// =============================================

error_reporting(E_ALL);
ini_set('display_errors', 0); // Desabilitar exibição de erros para não corromper downloads
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php_errors.log');

// Aumentar limites para upload de arquivos grandes
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
ini_set('max_execution_time', '300');
ini_set('memory_limit', '256M');

// Configurações de CORS
header("Access-Control-Allow-Origin: *"); // Permite que o app Tauri acesse
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Resposta para OPTIONS (Importante: o Tauri envia isso antes de cada POST)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Forçar JSON para respostas comuns
if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') === false) {
    header('Content-Type: application/json; charset=utf-8');
}
// ===== CORREÇÃO PRINCIPAL =====
// NÃO definir Content-Type aqui para permitir uploads de arquivo
// O Content-Type será definido DEPOIS, dependendo do tipo de requisição
// ==============================


// --- FUNÇÕES UTILITÁRIAS ---

/**
 * Função para retornar respostas em formato JSON.
 *
 * @param bool $success Indica se a operação foi bem-sucedida.
 * @param array|null $data Dados a serem retornados em caso de sucesso.
 * @param string|null $error Mensagem de erro em caso de falha.
 */
function jsonResponse($success, $data = null, $error = null) {
    // ⭐ CORREÇÃO: Limpar o buffer de saída antes de enviar cabeçalhos e JSON
    if (ob_get_length() > 0) {
        ob_end_clean();
    }
    header("Content-Type: application/json; charset=UTF-8");
    $response = [
        'success' => $success,
        'timestamp' => date('Y-m-d H:i:s')
    ];

    if ($success) {
        $response['data'] = $data;
    } else {
        $response['error'] = $error;
    }

    // Codifica a resposta para JSON e a envia
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit(); // Termina a execução após enviar a resposta
}

/**
 * Função para registrar erros em um arquivo de log.
 *
 * @param string $message A mensagem de erro a ser logada.
 */
function logError($message) {
    error_log("[" . date('Y-m-d H:i:s') . "] ADMIN API: " . $message);
}

/**
 * Função para sanitizar entradas do usuário, removendo tags HTML, espaços em branco extras e escapando caracteres especiais.
 *
 * @param string $input A string de entrada a ser sanitizada.
 * @return string A string sanitizada.
 */
function sanitizeInput($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8', false);
}

// ============================================================
// PHPMAILER — configuração SMTP centralizada
// Instale via Composer: composer require phpmailer/phpmailer
// ou baixe manualmente em https://github.com/PHPMailer/PHPMailer
// e coloque a pasta PHPMailer/ no mesmo diretório deste arquivo.
// ============================================================

// ── Carrega o autoloader do Composer (preferencial) ou os arquivos diretos ──
// IMPORTANTE: o require deve vir antes de qualquer referência às classes
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/PHPMailer/src/PHPMailer.php')) {
    require_once __DIR__ . '/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/PHPMailer/src/SMTP.php';
} else {
    error_log('[CCAPI] PHPMailer nao encontrado. Instale via Composer ou copie a pasta PHPMailer/src/.');
}

// ── Credenciais SMTP (altere aqui conforme seu provedor) ──────────────────
define('SMTP_HOST',       'smtp.hostinger.com');          // Servidor SMTP
define('SMTP_PORT',        465);                           // 465 = SSL | 587 = TLS
define('SMTP_ENCRYPTION',  'ssl');  // 'ssl' para porta 465 | 'tls' para porta 587
define('SMTP_USER',       'suporte@ccapiconsultoriaemcredito.com'); // Usuário SMTP
define('SMTP_PASS',       'Suporte@1281');          // ← substitua pela senha real
define('MAIL_FROM',       'suporte@ccapiconsultoriaemcredito.com');
define('MAIL_FROM_NAME',  'CCAPI Consultoria');
// BCC fixo: cópia silenciosa em todos os emails (deixe vazio '' para desativar)
define('MAIL_BCC',        '');

/**
 * Envia e-mail HTML via PHPMailer/SMTP.
 *
 * @param string|array $to        Destinatário: 'email@x.com' ou ['email@x.com' => 'Nome']
 * @param string       $subject   Assunto (UTF-8 puro, sem encode manual)
 * @param string       $message   Corpo HTML parcial (será envolvido no template)
 * @param array        $extraBcc  Lista adicional de endereços BCC ['email' => 'nome', ...]
 * @return bool
 */
function sendNotificationEmail($to, $subject, $message, array $extraBcc = []) {

    // Se PHPMailer não estiver disponível, loga e sai sem explodir
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        logError("PHPMailer não disponível — e-mail não enviado para: " . (is_array($to) ? implode(', ', array_keys($to)) : $to));
        return false;
    }

    // ── Template HTML completo ────────────────────────────────────────────
    $htmlBody = "<!DOCTYPE html>
<html lang='pt-BR'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <title>CCAPI Consultoria</title>
</head>
<body style='margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:32px 0;'>
    <tr>
      <td align='center'>
        <table width='600' cellpadding='0' cellspacing='0'
               style='background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;width:100%;'>

          <!-- Cabeçalho azul -->
          <tr>
            <td style='background:#2563eb;padding:28px 32px;text-align:center;'>
              <h1 style='margin:0;color:#ffffff;font-size:22px;letter-spacing:.5px;'>
                CCAPI Consultoria
              </h1>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style='padding:32px;color:#334155;font-size:15px;line-height:1.7;'>
              $message
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style='background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;
                       text-align:center;font-size:12px;color:#94a3b8;'>
              Este é um e-mail automático enviado pelo sistema CCAPI.<br>
              Por favor, não responda a esta mensagem.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

    try {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

        // ── Configuração SMTP ─────────────────────────────────────────────
        $mail->isSMTP();
        $mail->Host        = SMTP_HOST;
        $mail->Port        = SMTP_PORT;
        $mail->SMTPAuth    = true;
        $mail->Username    = SMTP_USER;
        $mail->Password    = SMTP_PASS;
        $mail->SMTPSecure  = SMTP_ENCRYPTION; // 'ssl' ou 'tls'
        $mail->SMTPOptions = [
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ]
        ];
        $mail->Timeout     = 15; // segundos
        // Loga detalhes do SMTP no error_log do servidor (útil para debug)
        $mail->SMTPDebug   = 2; // 0=off | 1=client | 2=client+server
        $mail->Debugoutput = function($str, $level) {
            error_log('[PHPMailer SMTP] ' . trim($str));
        };

        // ── Remetente e codificação ───────────────────────────────────────
        $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
        $mail->CharSet  = 'UTF-8';
        $mail->Encoding = 'base64';

        // ── Destinatário ─────────────────────────────────────────────────
        if (is_array($to)) {
            foreach ($to as $addr => $name) {
                $mail->addAddress(is_string($addr) ? $addr : $name, is_string($addr) ? $name : '');
            }
        } else {
            $mail->addAddress($to);
        }

        // ── BCC fixo + extras ─────────────────────────────────────────────
        if (defined('MAIL_BCC') && MAIL_BCC) {
            $mail->addBCC(MAIL_BCC);
        }
        foreach ($extraBcc as $bccAddr => $bccName) {
            $mail->addBCC(is_string($bccAddr) ? $bccAddr : $bccName,
                          is_string($bccAddr) ? $bccName : '');
        }

        // ── Assunto e corpo ───────────────────────────────────────────────
        $mail->Subject  = $subject;
        $mail->isHTML(true);
        $mail->Body     = $htmlBody;
        $mail->AltBody  = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</tr>', '</td>'], "\n", $message));

        $mail->send();
        return true;

    } catch (\PHPMailer\PHPMailer\Exception $e) {
        logError("PHPMailer erro ao enviar para '{$to}': " . $e->getMessage());
        return false;
    } catch (\Exception $e) {
        logError("Erro geral ao enviar e-mail para '{$to}': " . $e->getMessage());
        return false;
    }
}

// --- CONFIGURAÇÃO E GARANTIA DA ESTRUTURA DO BANCO DE DADOS ---

/**
 * Garante que a tabela `contratos_upload` exista com a estrutura correta.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a tabela foi configurada com sucesso.
 */
function ensureContratosTableModule($pdo) {
    try {
        // Verificar se a tabela `contratos_upload` existe
        $checkTable = $pdo->query("SHOW TABLES LIKE 'contratos_upload'");

        if ($checkTable->rowCount() == 0) {
            // Se a tabela não existir, cria-a com todas as colunas necessárias
            $pdo->exec("
                CREATE TABLE `contratos_upload` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `nome_cliente` VARCHAR(255) NOT NULL,
                    `telefone` VARCHAR(50) NOT NULL,
                    `arquivo_path` VARCHAR(500) NOT NULL,
                    `arquivo_nome` VARCHAR(255) NOT NULL,
                    `arquivo_tamanho` BIGINT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_nome_cliente` (`nome_cliente`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela contratos_upload criada com sucesso");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela contratos_upload: " . $e->getMessage());
        return false;
    }
}

/**
 * Garante que a tabela `user_admin` exista e tenha as colunas necessárias.
 * Cria a tabela ou adiciona/modifica colunas conforme necessário.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a tabela foi configurada com sucesso, False em caso de erro.
 */
function ensureAdminTable($pdo) {
    try {
        // Verificar se a tabela `user_admin` existe
        $checkTable = $pdo->query("SHOW TABLES LIKE 'user_admin'");

        if ($checkTable->rowCount() == 0) {
            // Se a tabela não existir, cria-a com colunas essenciais e índices
            $pdo->exec("
                CREATE TABLE `user_admin` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `name` VARCHAR(255) NOT NULL,
                    `email` VARCHAR(255) UNIQUE NOT NULL,
                    `password` VARCHAR(255) NOT NULL,
                    `user_type` VARCHAR(50) NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_email` (`email`),
                    INDEX `idx_user_type` (`user_type`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        } else {
            // Se a tabela existir, verifica e atualiza colunas conforme necessário

            // Verificar se a coluna `user_type` existe
            $checkColumn = $pdo->query("SHOW COLUMNS FROM user_admin LIKE 'user_type'");
            if ($checkColumn->rowCount() == 0) {
                // Adiciona a coluna `user_type` com um valor padrão
                $pdo->exec("ALTER TABLE user_admin ADD COLUMN user_type VARCHAR(50) NOT NULL DEFAULT 'administrador'");
            }

            // Verificar se a coluna `password` tem o tamanho correto
            $checkPassword = $pdo->query("SHOW COLUMNS FROM user_admin LIKE 'password'");
            $passwordInfo = $checkPassword->fetch(PDO::FETCH_ASSOC);
            // Se o tipo da coluna `password` não for VARCHAR(255), modifica para garantir o tamanho adequado para hashes
            if ($passwordInfo && strpos($passwordInfo['Type'], 'varchar(255)') === false) {
                $pdo->exec("ALTER TABLE user_admin MODIFY password VARCHAR(255) NOT NULL");
            }

            // Verificar se a coluna `last_login` existe
            $checkLastLogin = $pdo->query("SHOW COLUMNS FROM user_admin LIKE 'last_login'");
            if ($checkLastLogin->rowCount() == 0) {
                $pdo->exec("ALTER TABLE user_admin ADD COLUMN last_login TIMESTAMP NULL");
            }
        }

        return true; // Retorna true indicando sucesso na configuração

    } catch (PDOException $e) {
        // Em caso de erro durante a configuração, registra o erro e retorna false
        logError("Erro ao configurar tabela: " . $e->getMessage());
        return false;
    }
}

/**
 * Garante que a tabela `proposals` tenha a coluna `bank_name`.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a coluna foi criada/verificada com sucesso.
 */
function ensureBankNameColumn($pdo) {
    try {
        // Verificar se a coluna `bank_name` existe
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'bank_name'");
        if ($checkColumn->rowCount() == 0) {
            // Adiciona a coluna `bank_name` após a coluna `status`
            $pdo->exec("ALTER TABLE proposals ADD COLUMN bank_name VARCHAR(50) NULL AFTER status");
            logError("Coluna bank_name adicionada à tabela proposals");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao adicionar coluna bank_name: " . $e->getMessage());
        return false;
    }
}

/**
 * NOVA FUNÇÃO: Garante que a tabela `proposals` tenha as novas colunas para o formulário completo.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se as colunas foram criadas/verificadas com sucesso.
 */
function ensureProposalsNewColumns($pdo) {
    try {
        // Verificar e adicionar coluna client_type
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'client_type'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN client_type VARCHAR(10) DEFAULT 'pf' AFTER client_name");
            logError("Coluna client_type adicionada à tabela proposals");
        }
        
        // Verificar e adicionar coluna data_proposta
        $checkData = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'data_proposta'");
        if ($checkData->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN data_proposta DATE NULL AFTER status");
            logError("Coluna data_proposta adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna company_opening_date
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'company_opening_date'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN company_opening_date DATE NULL AFTER client_birth_date");
            logError("Coluna company_opening_date adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna partners
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'partners'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN partners TEXT NULL AFTER company_opening_date");
            logError("Coluna partners adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna client_cpf
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'client_cpf'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN client_cpf VARCHAR(20) NULL AFTER client_document");
            logError("Coluna client_cpf adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna client_cnpj
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'client_cnpj'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN client_cnpj VARCHAR(25) NULL AFTER client_cpf");
            logError("Coluna client_cnpj adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna client_has_cnh
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'client_has_cnh'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN client_has_cnh VARCHAR(10) NULL AFTER client_document");
            logError("Coluna client_has_cnh adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna vehicle_value
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'vehicle_value'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN vehicle_value DECIMAL(10, 2) NULL AFTER vehicle_year_model");
            logError("Coluna vehicle_value adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna vehicle_plate
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'vehicle_plate'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN vehicle_plate VARCHAR(20) NULL AFTER vehicle_value");
            logError("Coluna vehicle_plate adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna vehicle_condition
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'vehicle_condition'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN vehicle_condition VARCHAR(20) NULL AFTER vehicle_plate");
            logError("Coluna vehicle_condition adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna finance_entry
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'finance_entry'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN finance_entry DECIMAL(10, 2) NULL AFTER finance_value");
            logError("Coluna finance_entry adicionada à tabela proposals");
        }

        // Verificar e adicionar coluna finance_product_type
        $checkColumn = $pdo->query("SHOW COLUMNS FROM proposals LIKE 'finance_product_type'");
        if ($checkColumn->rowCount() == 0) {
            $pdo->exec("ALTER TABLE proposals ADD COLUMN finance_product_type VARCHAR(30) NULL AFTER finance_entry");
            logError("Coluna finance_product_type adicionada à tabela proposals");
        }

        // Novas colunas solicitadas pelo usuário
        $newFields = [
            'client_naturalidade' => "VARCHAR(100) NULL AFTER client_birth_date",
            'client_mother_name' => "VARCHAR(255) NULL AFTER client_naturalidade",
            'client_father_name' => "VARCHAR(255) NULL AFTER client_mother_name",
            'client_rg' => "VARCHAR(20) NULL AFTER client_cpf",
            'client_rg_uf' => "VARCHAR(5) NULL AFTER client_rg",
            'client_income' => "DECIMAL(10, 2) NULL AFTER client_profession",
            'indicated_by' => "VARCHAR(255) NULL AFTER bank_name"
        ];

        foreach ($newFields as $col => $definition) {
            $check = $pdo->query("SHOW COLUMNS FROM proposals LIKE '$col'");
            if ($check->rowCount() == 0) {
                $pdo->exec("ALTER TABLE proposals ADD COLUMN $col $definition");
                logError("Coluna $col adicionada à tabela proposals");
            }
        }

        return true;
    } catch (PDOException $e) {
        logError("Erro ao adicionar novas colunas: " . $e->getMessage());
        return false;
    }
}


/**
 * NOVA FUNÇÃO: Garante que a tabela `financeiro` exista com a estrutura correta.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a tabela foi configurada com sucesso.
 */
function ensureFinanceiroTable($pdo) {
    try {
        // Verificar se a tabela `financeiro` existe
        $checkTable = $pdo->query("SHOW TABLES LIKE 'financeiro'");

        if ($checkTable->rowCount() == 0) {
            // Se a tabela não existir, cria-a com todas as colunas necessárias
            $pdo->exec("
                CREATE TABLE `financeiro` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `nome_conta` VARCHAR(255) NOT NULL,
                    `valor` DECIMAL(10, 2) NOT NULL,
                    `dia_pagamento` INT NOT NULL,
                    `frequencia` VARCHAR(50) NOT NULL,
                    `categoria` VARCHAR(100) NOT NULL,
                    `observacao` TEXT NULL,
                    `pago` BOOLEAN DEFAULT FALSE,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_categoria` (`categoria`),
                    INDEX `idx_pago` (`pago`),
                    INDEX `idx_frequencia` (`frequencia`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela financeiro criada com sucesso");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela financeiro: " . $e->getMessage());
        return false;
    }
}

/**
 * NOVA FUNÇÃO CORRIGIDA: Garante que a tabela de planilhas existe com estrutura simplificada
 * Armazena apenas metadados, não o conteúdo completo
 */
function ensurePlanilhasTable($pdo) {
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'planilhas'");
        if ($checkTable->rowCount() == 0) {
            $pdo->exec("
                CREATE TABLE `planilhas` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `nome` VARCHAR(255) NOT NULL,
                    `nome_original` VARCHAR(255) NOT NULL,
                    `caminho_arquivo` VARCHAR(500) NOT NULL,
                    `tamanho` BIGINT NOT NULL,
                    `extensao` VARCHAR(10) NOT NULL,
                    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_nome` (`nome`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela planilhas criada com sucesso");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela planilhas: " . $e->getMessage());
        return false;
    }
}

/**
 * NOVA FUNÇÃO: Garante que a tabela `proposal_documents` exista com a estrutura correta.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a tabela foi configurada com sucesso.
 */
function ensureContatosTable($pdo) {
    try {
        // Verificar se a tabela `contatos` existe
        $checkTable = $pdo->query("SHOW TABLES LIKE 'contatos'");

        if ($checkTable->rowCount() == 0) {
            // Se a tabela não existir, cria-a com todas as colunas necessárias
            $pdo->exec("
                CREATE TABLE `contatos` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `nome` VARCHAR(255) NOT NULL,
                    `nome_fantasia` VARCHAR(255) NOT NULL,
                    `data_inicio_parceria` VARCHAR(20) NULL,
                    `local` VARCHAR(255) NULL,
                    `telefone` VARCHAR(50) NULL,
                    `nome_loja` VARCHAR(255) NULL,
                    `cnpj` VARCHAR(50) NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_nome_fantasia` (`nome_fantasia`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela contatos criada com sucesso");
        } else {
            // Verificar se a coluna data_inicio_parceria existe
            $checkColumn = $pdo->query("SHOW COLUMNS FROM contatos LIKE 'data_inicio_parceria'");
            if ($checkColumn->rowCount() == 0) {
                $pdo->exec("ALTER TABLE contatos ADD COLUMN data_inicio_parceria VARCHAR(20) NULL AFTER nome_fantasia");
                logError("Coluna data_inicio_parceria adicionada à tabela contatos");
            }
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela contatos: " . $e->getMessage());
        return false;
    }
}

/**
 * NOVA FUNÇÃO: Garante que a tabela `notas_fiscais` exista com a estrutura correta.
 *
 * @param PDO $pdo Objeto PDO para interagir com o banco de dados.
 * @return bool True se a tabela foi configurada com sucesso.
 */
function ensureNotasFiscaisTable($pdo) {
    try {
        // Verificar se a tabela `notas_fiscais` existe
        $checkTable = $pdo->query("SHOW TABLES LIKE 'notas_fiscais'");

        if ($checkTable->rowCount() == 0) {
            // Se a tabela não existir, cria-a com todas as colunas necessárias
            $pdo->exec("
                CREATE TABLE `notas_fiscais` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `nome_cliente` VARCHAR(255) NULL,
                    `telefone` VARCHAR(50) NULL,
                    `data` DATE NULL,
                    `email` VARCHAR(255) NULL,
                    `cpf` VARCHAR(50) NULL,
                    `local` VARCHAR(255) NOT NULL,
                    `arquivo_path` VARCHAR(500) NOT NULL,
                    `arquivo_nome` VARCHAR(255) NOT NULL,
                    `arquivo_tamanho` BIGINT NOT NULL,
                    `arquivo_tipo` VARCHAR(10) NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_nome_cliente` (`nome_cliente`),
                    INDEX `idx_local` (`local`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela notas_fiscais criada com sucesso");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela notas_fiscais: " . $e->getMessage());
        return false;
    }
}

function ensureProposalDocumentsTable($pdo) {
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'proposal_documents'");
        if ($checkTable->rowCount() == 0) {
            $pdo->exec("
                CREATE TABLE `proposal_documents` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `proposal_id` INT NOT NULL,
                    `client_name` VARCHAR(255) NOT NULL,
                    `document_type` VARCHAR(100) NULL,
                    `file_path` VARCHAR(500) NOT NULL,
                    `file_name` VARCHAR(255) NOT NULL,
                    `file_size` BIGINT NOT NULL,
                    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX `idx_proposal_id` (`proposal_id`),
                    INDEX `idx_client_name` (`client_name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
            logError("Tabela proposal_documents criada com sucesso");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabela proposal_documents: " . $e->getMessage());
        return false;
    }
}

/**
 * Garante que as tabelas de suporte existam.
 */
function ensureSupportTables($pdo) {
    try {
        // Tabela de Tickets de Suporte
        $checkTickets = $pdo->query("SHOW TABLES LIKE 'support_tickets'");
        if ($checkTickets->rowCount() == 0) {
            $pdo->exec("
                CREATE TABLE `support_tickets` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `user_id` INT NOT NULL,
                    `user_name` VARCHAR(255) NOT NULL,
                    `user_type` VARCHAR(50) NOT NULL,
                    `status` VARCHAR(20) DEFAULT 'open',
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }

        // Tabela de Mensagens de Suporte
        $checkMessages = $pdo->query("SHOW TABLES LIKE 'support_messages'");
        if ($checkMessages->rowCount() == 0) {
            $pdo->exec("
                CREATE TABLE `support_messages` (
                    `id` INT AUTO_INCREMENT PRIMARY KEY,
                    `ticket_id` INT NULL,
                    `sender_id` INT NOT NULL,
                    `sender_name` VARCHAR(255) NOT NULL,
                    `sender_type` VARCHAR(50) NOT NULL,
                    `message` TEXT NOT NULL,
                    `is_global` BOOLEAN DEFAULT TRUE,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }
        return true;
    } catch (PDOException $e) {
        logError("Erro ao criar tabelas de suporte: " . $e->getMessage());
        return false;
    }
}

// --- CONEXÃO COM O BANCO DE DADOS ---
try {
    // Configura a conexão PDO com o banco de dados MySQL
    $pdo = new PDO(
        "mysql:host=localhost;dbname=u420264728_Ccapi;charset=utf8mb4", // String de conexão
        "u420264728_admin", // Nome de usuário do banco de dados
        "Ccapibd1281", // Senha do banco de dados
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, // Habilita o modo de exceção para erros de PDO
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, // Define o modo de busca padrão como array associativo
            PDO::ATTR_EMULATE_PREPARES => false, // Desabilita a emulação de prepared statements para melhor segurança e desempenho
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4" // Define o charset para utf8mb4 na conexão
        ]
    );

    // Chama a função para garantir a estrutura da tabela `user_admin`
    ensureAdminTable($pdo);

    // Chama a função para garantir a coluna `bank_name` na tabela `proposals`
    ensureBankNameColumn($pdo);

    // Chama a função para garantir as novas colunas da tabela `proposals`
    ensureProposalsNewColumns($pdo);

    // NOVA: Chama a função para garantir a tabela `financeiro`
    ensureFinanceiroTable($pdo);

    // NOVA: Chama a função para garantir a tabela `planilhas`
    ensurePlanilhasTable($pdo);

    // NOVA: Chama a função para garantir a tabela `proposal_documents`
    ensureProposalDocumentsTable($pdo);

    // NOVA: Chama a função para garantir a tabela `notas_fiscais`
    ensureNotasFiscaisTable($pdo);

    // NOVA: Chama a função para garantir a tabela `contatos`
    ensureContatosTable($pdo);

    // NOVA: Chama a função para garantir as tabelas de suporte
    ensureSupportTables($pdo);

} catch (PDOException $e) {
    // Se a conexão falhar, registra o erro e retorna uma resposta JSON de erro
    logError("Erro de conexão: " . $e->getMessage());
    jsonResponse(false, null, "Erro de conexão com banco de dados");
}

// --- PROCESSAMENTO DA REQUISIÇÃO ---
$input = null; // Inicializa a variável de entrada
$method = $_SERVER['REQUEST_METHOD']; // Obtém o método da requisição (GET, POST, etc.)

// Processa a entrada JSON para requisições POST
        if ($method === 'POST') {
            // Verifica se a requisição é um upload de arquivo (multipart/form-data)
            // O PHP preenche $_POST e $_FILES automaticamente para multipart/form-data
            if (isset($_FILES['file']) || isset($_FILES['arquivo']) || isset($_FILES['document'])) {
                // Se for upload de arquivo, a entrada é o $_POST
                $input = $_POST;
            } else {
                // Se não for upload de arquivo, processar como JSON
                $rawInput = file_get_contents("php://input"); // Lê o corpo da requisição
                $input = json_decode($rawInput, true); // Decodifica o JSON em um array associativo
        
                // Verifica se o JSON decodificado é inválido
                if (json_last_error() !== JSON_ERROR_NONE) {
                    // Se o corpo estiver vazio, pode ser uma requisição POST sem corpo (ex: apenas com headers)
                    if (trim($rawInput) !== '') {
                        jsonResponse(false, null, "Dados JSON inválidos");
                    }
                }
            }
        }
// Para requisições GET, a entrada é retirada de $_GET
else if ($method === 'GET') {
    $input = $_GET;
}

// Verifica se a ação foi especificada na entrada
if (!isset($input['action'])) {
    jsonResponse(false, null, "Ação não especificada");
}

$action = $input['action']; // Obtém a ação a ser executada

// --- SWITCH DE AÇÕES ---
switch ($action) {

// ============ NOVA API: UPLOAD DE DOCUMENTO DE PROPOSTA ============
case 'upload_proposal_document':
    try {
        if (empty($_POST['proposal_id'])) {
            jsonResponse(false, null, "ID da proposta não especificado");
        }
        
        if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['document'])) {
                switch ($_FILES['document']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg .= " (código de erro: " . $_FILES['document']['error'] . ")";
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $proposalId = (int)$_POST['proposal_id'];
        
        // Buscar dados da proposta
        $stmt = $pdo->prepare("SELECT client_name, specialist FROM proposals WHERE id = ?");
        $stmt->execute([$proposalId]);
        $proposal = $stmt->fetch();
        
        if (!$proposal) {
            jsonResponse(false, null, "Proposta não encontrada");
        }
        
        $file = $_FILES['document'];
        $fileName = $file['name'];
        $fileTmp = $file['tmp_name'];
        $fileSize = $file['size'];
        
        // Validar extensão do arquivo
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'];
        if (!in_array($ext, $allowedExtensions)) {
            jsonResponse(false, null, "Tipo de arquivo não permitido. Permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX");
        }
        
        // Validar tamanho
        if ($fileSize > 50 * 1024 * 1024) {
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        // Criar diretório se não existir
        $uploadDir = __DIR__ . '/uploads/proposal_documents/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                jsonResponse(false, null, "Erro ao criar diretório de upload");
            }
        }
        
        // Gerar nome único para o arquivo
        $nomeArquivo = 'prop_' . $proposalId . '_' . uniqid() . '_' . time() . '.' . $ext;
        $caminhoCompleto = $uploadDir . $nomeArquivo;
        
        // Mover arquivo para o diretório
        if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
            jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
        }
        
        $caminhoRelativo = 'uploads/proposal_documents/' . $nomeArquivo;
        
        // Tipo de documento (opcional)
        $documentType = !empty($_POST['document_type']) ? sanitizeInput($_POST['document_type']) : null;
        
        // Inserir no banco de dados
        $stmt = $pdo->prepare("
            INSERT INTO proposal_documents (proposal_id, client_name, document_type, file_path, file_name, file_size)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([
            $proposalId,
            $proposal['client_name'],
            $documentType,
            $caminhoRelativo,
            $fileName,
            $fileSize
        ]);
        
        if ($result) {
            $documentId = $pdo->lastInsertId();
            logError("Documento anexado à proposta #$proposalId: $fileName");
            jsonResponse(true, [
                'message' => 'Documento anexado com sucesso!',
                'document_id' => $documentId,
                'proposal_id' => $proposalId,
                'client_name' => $proposal['client_name']
            ]);
        } else {
            if (file_exists($caminhoCompleto)) {
                unlink($caminhoCompleto);
            }
            jsonResponse(false, null, "Erro ao salvar documento no banco de dados");
        }
        
    } catch (Exception $e) {
        logError("Erro ao fazer upload de documento de proposta: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar documento: " . $e->getMessage());
    }
    break;

// ============ API: LISTAR DOCUMENTOS DE UMA PROPOSTA ============
case 'get_proposal_documents':
    try {
        if (empty($input['proposal_id'])) {
            jsonResponse(false, null, "ID da proposta não especificado");
        }
        
        $proposalId = (int)$input['proposal_id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                proposal_id,
                client_name,
                document_type,
                file_path,
                file_name,
                file_size,
                uploaded_at
            FROM proposal_documents
            WHERE proposal_id = ?
            ORDER BY uploaded_at DESC
        ");
        $stmt->execute([$proposalId]);
        $documents = $stmt->fetchAll();
        
        jsonResponse(true, ['documents' => $documents]);
        
    } catch (PDOException $e) {
        logError("Erro ao buscar documentos da proposta: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar documentos");
    }
    break;

// ============ API: DOWNLOAD DE DOCUMENTO ============
case 'download_document':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do documento não especificado");
        }
        
        $documentId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT file_path, file_name FROM proposal_documents WHERE id = ?");
        $stmt->execute([$documentId]);
        $document = $stmt->fetch();
        
        if (!$document) {
            jsonResponse(false, null, "Documento não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $document['file_path'];
        
        if (!file_exists($caminhoArquivo)) {
            logError("Arquivo não encontrado: " . $caminhoArquivo);
            jsonResponse(false, null, "Arquivo não encontrado no servidor");
        }
        
        $ext = strtolower(pathinfo($document['file_name'], PATHINFO_EXTENSION));
        $contentTypes = [
            'pdf' => 'application/pdf',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        $contentType = $contentTypes[$ext] ?? 'application/octet-stream';
        
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $document['file_name'] . '"');
        header('Content-Length: ' . filesize($caminhoArquivo));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($caminhoArquivo);
        exit;
        
    } catch (Exception $e) {
        logError("Erro ao fazer download do documento: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao fazer download do documento");
    }
    break;

// ============ API: LISTAR TODOS OS DOCUMENTOS (para aba Documentos) ============
case 'list_proposal_documents':
    try {
        $specialist = $input['specialist_field'] ?? null;
        $searchTerm = $input['search'] ?? '';
        
        $query = "
            SELECT 
                pd.id,
                pd.proposal_id,
                pd.client_name,
                pd.document_type,
                pd.file_path,
                pd.file_name,
                pd.file_size,
                pd.uploaded_at,
                p.specialist
            FROM proposal_documents pd
            LEFT JOIN proposals p ON pd.proposal_id = p.id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($specialist) {
            $query .= " AND p.specialist = ?";
            $params[] = $specialist;
        }
        
        if ($searchTerm) {
            $query .= " AND pd.client_name LIKE ?";
            $params[] = '%' . $searchTerm . '%';
        }
        
        $query .= " ORDER BY pd.uploaded_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $documents = $stmt->fetchAll();
        
        // Contar documentos e clientes
        $totalDocs = count($documents);
        $clientesUnicos = array_unique(array_column($documents, 'client_name'));
        $totalClients = count($clientesUnicos);
        
        jsonResponse(true, [
            'documents' => $documents,
            'total_documents' => $totalDocs,
            'total_clients' => $totalClients
        ]);
        
    } catch (PDOException $e) {
        logError("Erro ao listar documentos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar documentos");
    }
    break;
    // --- CASO: REGISTRO DE ADMINISTRADOR ---
    case 'admin_register':
        try {
            // Define os campos obrigatórios para o registro
            $requiredFields = ['name', 'email', 'password', 'user_type'];
            foreach ($requiredFields as $field) {
                // Verifica se algum campo obrigatório está vazio
                if (empty($input[$field])) {
                    jsonResponse(false, null, "Campo obrigatório: $field");
                }
            }

            // Sanitiza os dados de entrada
            $name = sanitizeInput($input['name']);
            $email = sanitizeInput($input['email']);
            $password = $input['password']; // A senha será hasheada, não precisa sanitizar com htmlspecialchars
            $userType = sanitizeInput($input['user_type']);

            // Normaliza o tipo de usuário para 'administrador' se forem termos equivalentes
            if ($userType === 'admin' || $userType === 'administrador') {
                $userType = 'administrador';
            }

            // Valida o formato do email
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(false, null, "Email inválido");
            }

            // Valida os tipos de usuário permitidos
            $validTypes = ['administrador', 'fabricio', 'neto', 'wandreyna', 'suzana', 'eder'];
            if (!in_array($userType, $validTypes)) {
                jsonResponse(false, null, "Tipo de usuário inválido");
            }

            // Verifica se o email já está cadastrado no banco de dados
            $stmt = $pdo->prepare("SELECT id FROM user_admin WHERE email = ?");
            $stmt->execute([$email]);

            if ($stmt->rowCount() > 0) {
                jsonResponse(false, null, "Email já cadastrado");
            }

            // Gera um hash seguro para a senha usando password_hash
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Prepara e executa a query para inserir o novo usuário no banco de dados
            $stmt = $pdo->prepare("
                INSERT INTO user_admin (name, email, password, user_type)
                VALUES (?, ?, ?, ?)
            ");

            $result = $stmt->execute([$name, $email, $hashedPassword, $userType]);

            if ($result) {
                // Se a inserção for bem-sucedida, obtém o ID do usuário recém-criado e loga a ação
                $userId = $pdo->lastInsertId();
                logError("Usuário cadastrado: ID $userId, Email: $email, Tipo: $userType");

                // Retorna uma resposta JSON de sucesso com a mensagem e o ID do usuário
                jsonResponse(true, [
                    'message' => 'Usuário cadastrado com sucesso!',
                    'user_id' => $userId
                ]);
            } else {
                // Se a inserção falhar, retorna uma resposta JSON de erro
                jsonResponse(false, null, "Erro ao cadastrar usuário");
            }

        } catch (PDOException $e) {
            // Captura exceções PDO, loga o erro e retorna uma resposta JSON específica
            logError("Erro no registro: " . $e->getMessage());
            if ($e->getCode() == '23000') { // Código de erro para violação de chave única (email já existe)
                jsonResponse(false, null, "Email já cadastrado");
            } else {
                jsonResponse(false, null, "Erro no banco de dados");
            }
        }
        break;

    // --- CASO: LOGIN DE ADMINISTRADOR ---
    case 'admin_login':
        try {
            // Verifica se email e senha foram fornecidos
            if (empty($input['email']) || empty($input['password'])) {
                jsonResponse(false, null, "Email e senha são obrigatórios");
            }

            // Sanitiza o email e obtém a senha
            $email = sanitizeInput($input['email']);
            $password = $input['password'];

            // Busca o usuário no banco de dados pelo email
            $stmt = $pdo->prepare("SELECT id, name, email, password, user_type FROM user_admin WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(); // Obtém os dados do usuário como array associativo

            // Se o usuário não for encontrado, retorna erro
            if (!$user) {
                logError("Login falhado - email não encontrado: $email");
                jsonResponse(false, null, "Email ou senha incorretos");
            }

            // Normaliza o tipo de usuário para login se necessário
            if ($user['user_type'] === 'admin') {
                $user['user_type'] = 'administrador';
            }

            // Verifica se a senha fornecida corresponde ao hash armazenado
            if (!password_verify($password, $user['password'])) {
                logError("Login falhado - senha incorreta para: $email");
                jsonResponse(false, null, "Email ou senha incorretos");
            }

            // Se a autenticação for bem-sucedida, loga o evento e retorna os dados do usuário
            logError("Login bem-sucedido: $email (Tipo: {$user['user_type']})");

            // Atualiza o último login do usuário
            $stmtUpdate = $pdo->prepare("UPDATE user_admin SET last_login = CURRENT_TIMESTAMP WHERE id = ?");
            $stmtUpdate->execute([$user['id']]);

            jsonResponse(true, [
                'message' => 'Login realizado com sucesso!',
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type']
                ]
            ]);

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados durante o login
            logError("Erro no login: " . $e->getMessage());
            jsonResponse(false, null, "Erro interno do servidor");
        }
        break;

    // --- CASO: OBTER ESTATÍSTICAS GERAIS (OVERVIEW) ---
    case 'get_overview_stats':
        try {
            $stats = []; // Inicializa um array para armazenar as estatísticas

            // Consulta o total de propostas
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals");
            $stats['total_proposals'] = (int)$stmt->fetchColumn();

            // Consulta o total de usuários
            $stmt = $pdo->query("SELECT COUNT(*) FROM users");
            $stats['total_users'] = (int)$stmt->fetchColumn();

            // Consulta o número de propostas pendentes
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals WHERE status = 'pending'");
            $stats['pending_proposals'] = (int)$stmt->fetchColumn();

            // Consulta o número de propostas em análise
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals WHERE status = 'analyzing'");
            $stats['analyzing_proposals'] = (int)$stmt->fetchColumn();

            // Consulta o número de propostas aprovadas
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals WHERE status = 'approved'");
            $stats['approved_proposals'] = (int)$stmt->fetchColumn();

            // Consulta o número de propostas rejeitadas
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals WHERE status = 'rejected'");
            $stats['rejected_proposals'] = (int)$stmt->fetchColumn();

            // Consulta o número de propostas formalizadas
            $stmt = $pdo->query("SELECT COUNT(*) FROM proposals WHERE status = 'formalizada'");
            $stats['formalizada_proposals'] = (int)$stmt->fetchColumn();

            // Retorna as estatísticas em formato JSON
            jsonResponse(true, $stats);

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar estatísticas: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao carregar estatísticas");
        }
        break;

    // --- CASO: OBTER TODAS AS PROPOSTAS ---
    case 'get_all_proposals':
        try {
            // Seleciona informações relevantes de todas as propostas, ordenadas por data de criação decrescente
            $stmt = $pdo->query("
                SELECT id, client_name, client_document, specialist, finance_value as valor, status, bank_name, created_at, vehicle_year_manufacture, vehicle_year_model
                FROM proposals
                ORDER BY created_at DESC
            ");
            $proposals = $stmt->fetchAll(); // Obtém todos os resultados
            jsonResponse(true, ['proposals' => $proposals]); // Retorna as propostas em JSON
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar propostas: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER PROPOSTAS DE UM ESPECIALISTA ESPECÍFICO ---
    case 'get_specialist_proposals':
        try {
            // Verifica se o ID do especialista foi fornecido
            if (empty($input['specialist'])) {
                jsonResponse(false, null, "Especialista não especificado");
            }

            $specialist = sanitizeInput($input['specialist']); // Sanitiza o nome do especialista

            // Seleciona propostas filtradas pelo especialista, ordenadas por data de criação
            $stmt = $pdo->prepare("
                SELECT id, id as proposal_id, client_name, client_document, finance_value as valor, status, bank_name, created_at, vehicle_year_manufacture, vehicle_year_model
                FROM proposals
                WHERE specialist = ?
                ORDER BY created_at DESC
            ");
            $stmt->execute([$specialist]); // Executa a query com o parâmetro do especialista
            $proposals = $stmt->fetchAll(); // Obtém os resultados

            jsonResponse(true, ['proposals' => $proposals]); // Retorna as propostas em JSON
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar propostas do especialista: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER DETALHES DE UMA PROPOSTA ESPECÍFICA ---
    case 'get_proposal_details':
        try {
            // Verifica se o ID da proposta foi fornecido
            if (empty($input['proposal_id'])) {
                jsonResponse(false, null, "ID da proposta não especificado");
            }

            $proposalId = (int)$input['proposal_id']; // Converte o ID da proposta para inteiro

            // Seleciona todos os campos de uma proposta específica pelo ID
            $stmt = $pdo->prepare("SELECT * FROM proposals WHERE id = ?");
            $stmt->execute([$proposalId]); // Executa a query com o ID da proposta
            $proposal = $stmt->fetch(); // Obtém o resultado

            if ($proposal) {
                jsonResponse(true, ['proposal' => $proposal]); // Retorna os detalhes da proposta
            } else {
                jsonResponse(false, null, "Proposta não encontrada"); // Retorna erro se a proposta não for encontrada
            }
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar detalhes da proposta: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;


    // --- CASO: CRIAR NOVA PROPOSTA ---
    case 'get_proposals_by_bank':
        $bank = isset($_GET['bank']) ? sanitizeInput($_GET['bank']) : '';
        if (empty($bank)) jsonResponse(false, null, 'Banco não especificado');
        try {
            $stmt = $pdo->prepare("SELECT * FROM proposals WHERE bank_name = ? ORDER BY created_at DESC");
            $stmt->execute([$bank]);
            jsonResponse(true, ['proposals' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) {
            jsonResponse(false, null, 'Erro ao buscar propostas');
        }
        break;

    case 'create_proposal':
        // Sanitizar e validar dados de entrada
        $clientType = isset($input['client_type']) ? sanitizeInput($input['client_type']) : 'pf';
        $clientName = isset($input['client_name']) ? sanitizeInput($input['client_name']) : '';
        $clientDocument = isset($input['client_document']) ? sanitizeInput($input['client_document']) : '';
        $clientCPF = isset($input['client_cpf']) ? sanitizeInput($input['client_cpf']) : '';
        $clientCNPJ = isset($input['client_cnpj']) ? sanitizeInput($input['client_cnpj']) : '';
        $companyOpeningDate = isset($input['company_opening_date']) ? sanitizeInput($input['company_opening_date']) : null;
        $partners = isset($input['partners']) ? $input['partners'] : null; // JSON string from JS
        $clientHasCnh = isset($input['client_has_cnh']) ? sanitizeInput($input['client_has_cnh']) : '';
        $clientPhone = isset($input['client_phone']) ? sanitizeInput($input['client_phone']) : '';
        $clientEmail = isset($input['client_email']) ? sanitizeInput($input['client_email']) : '';
        $clientBirthDate = isset($input['client_birth_date']) ? sanitizeInput($input['client_birth_date']) : '';
        $clientProfession = isset($input['client_profession']) ? sanitizeInput($input['client_profession']) : '';
        $clientIncome = isset($input['client_income']) ? floatval($input['client_income']) : 0;
        $clientCep = isset($input['client_cep']) ? sanitizeInput($input['client_cep']) : '';
        $clientAddress = isset($input['client_address']) ? sanitizeInput($input['client_address']) : '';
        
        $vehicleType = isset($input['vehicle_type']) ? sanitizeInput($input['vehicle_type']) : '';
        $vehicleBrand = isset($input['vehicle_brand']) ? sanitizeInput($input['vehicle_brand']) : '';
        $vehicleModel = isset($input['vehicle_model']) ? sanitizeInput($input['vehicle_model']) : '';
        $vehicleYearManufacture = isset($input['vehicle_year_manufacture']) ? sanitizeInput($input['vehicle_year_manufacture']) : '';
        $vehicleYearModel = isset($input['vehicle_year_model']) ? sanitizeInput($input['vehicle_year_model']) : '';
        $vehicleValue = isset($input['vehicle_value']) ? floatval($input['vehicle_value']) : 0;
        $vehiclePlate = isset($input['vehicle_plate']) ? sanitizeInput($input['vehicle_plate']) : '';
        $vehicleCondition = isset($input['vehicle_condition']) ? sanitizeInput($input['vehicle_condition']) : '';
        
        $financeValue = isset($input['finance_value']) ? floatval($input['finance_value']) : 0;
        $financeEntry = isset($input['finance_entry']) ? floatval($input['finance_entry']) : 0;
        $financeProductType = isset($input['finance_product_type']) ? sanitizeInput($input['finance_product_type']) : '';
        $bankName = isset($input['bank_name']) ? sanitizeInput($input['bank_name']) : '';
        
        $specialist = isset($input['specialist']) ? sanitizeInput($input['specialist']) : '';
        $status = 'analyzing'; // Status automático: em análise
        $observation = isset($input['observation']) ? sanitizeInput($input['observation']) : '';
        $dataProposta = !empty($input['data_proposta']) ? sanitizeInput($input['data_proposta']) : date('Y-m-d');

        // Validação básica
        if (empty($clientName) || empty($clientDocument)) {
            jsonResponse(false, null, 'Nome e CPF/CNPJ do cliente são obrigatórios');
        }

        try {
            $stmt = $pdo->prepare("
                INSERT INTO proposals (
                    client_type, client_name, client_document, client_cpf, client_rg, client_rg_uf, client_cnpj, client_has_cnh, client_phone, client_email,
                    client_birth_date, client_naturalidade, client_mother_name, client_father_name, company_opening_date, partners, client_profession, client_income, client_cep, client_address,
                    vehicle_type, vehicle_brand, vehicle_model, vehicle_year_manufacture, vehicle_year_model,
                    vehicle_value, vehicle_plate, vehicle_condition,
                    finance_value, finance_entry, finance_product_type, bank_name, indicated_by,
                    specialist, status, observation, data_proposta, created_at
                ) VALUES (
                    :client_type, :client_name, :client_document, :client_cpf, :client_rg, :client_rg_uf, :client_cnpj, :client_has_cnh, :client_phone, :client_email,
                    :client_birth_date, :client_naturalidade, :client_mother_name, :client_father_name, :company_opening_date, :partners, :client_profession, :client_income, :client_cep, :client_address,
                    :vehicle_type, :vehicle_brand, :vehicle_model, :vehicle_year_manufacture, :vehicle_year_model,
                    :vehicle_value, :vehicle_plate, :vehicle_condition,
                    :finance_value, :finance_entry, :finance_product_type, :bank_name, :indicated_by,
                    :specialist, :status, :observation, :data_proposta, NOW()
                )
            ");

            $stmt->execute([
                'client_type' => $clientType,
                'client_name' => $clientName,
                'client_document' => $clientDocument,
                'client_cpf' => $clientCPF,
                'client_rg' => isset($input['client_rg']) ? sanitizeInput($input['client_rg']) : '',
                'client_rg_uf' => isset($input['client_rg_uf']) ? sanitizeInput($input['client_rg_uf']) : '',
                'client_cnpj' => $clientCNPJ,
                'client_has_cnh' => $clientHasCnh,
                'client_phone' => $clientPhone,
                'client_email' => $clientEmail,
                'client_birth_date' => !empty($clientBirthDate) ? $clientBirthDate : null,
                'client_naturalidade' => isset($input['client_naturalidade']) ? sanitizeInput($input['client_naturalidade']) : '',
                'client_mother_name' => isset($input['client_mother_name']) ? sanitizeInput($input['client_mother_name']) : '',
                'client_father_name' => isset($input['client_father_name']) ? sanitizeInput($input['client_father_name']) : '',
                'company_opening_date' => !empty($companyOpeningDate) ? $companyOpeningDate : null,
                'partners' => $partners,
                'client_profession' => $clientProfession,
                'client_income' => $clientIncome,
                'client_cep' => $clientCep,
                'client_address' => $clientAddress,
                'vehicle_type' => $vehicleType,
                'vehicle_brand' => $vehicleBrand,
                'vehicle_model' => $vehicleModel,
                'vehicle_year_manufacture' => $vehicleYearManufacture,
                'vehicle_year_model' => $vehicleYearModel,
                'vehicle_value' => $vehicleValue,
                'vehicle_plate' => $vehiclePlate,
                'vehicle_condition' => $vehicleCondition,
                'finance_value' => $financeValue,
                'finance_entry' => $financeEntry,
                'finance_product_type' => $financeProductType,
                'bank_name' => $bankName,
                'indicated_by' => isset($input['indicated_by']) ? sanitizeInput($input['indicated_by']) : '',
                'specialist' => $specialist,
                'status' => $status,
                'observation' => $observation,
                'data_proposta' => $dataProposta
            ]);

            $proposalId = $pdo->lastInsertId();

            // Buscar e-mail do especialista dinamicamente no banco de dados
            $specialistEmail = null;
            if (!empty($specialist)) {
                try {
                    $stmtSpecialist = $pdo->prepare("SELECT email FROM users WHERE name = ? AND role = 'specialist' LIMIT 1");
                    $stmtSpecialist->execute([$specialist]);
                    $specialistData = $stmtSpecialist->fetch(PDO::FETCH_ASSOC);
                    if ($specialistData && !empty($specialistData['email'])) {
                        $specialistEmail = $specialistData['email'];
                    }
                } catch (Exception $e) {
                    logError("Erro ao buscar e-mail do especialista: " . $e->getMessage());
                }
            }
            
            // Fallback: Mapeamento de e-mails padrão caso não encontre no banco
            if (!$specialistEmail) {
                $specialistEmails = [
                    'Fabrício' => 'fabricioccapi@gmail.com',
                    'Neto' => 'neto.ccapi@gmail.com',
                    'Éder' => 'eder.ccapi@gmail.com',
                    'Wandreyna' => 'wandreynas4@gmail.com',
                    'Suzana' => 'suzana.ccapi@hotmail.com'
                ];
                $specialistEmail = isset($specialistEmails[$specialist]) ? $specialistEmails[$specialist] : null;
            }
            
	            $dateNow = date('d/m/Y');
	            $origin = isset($input['origin']) ? $input['origin'] : 'site';
	            $mainSupportEmail = 'suporte@ccapiconsultoriaemcredito.com';
	            $monitoringEmails = 'xavier.oliveira013@gmail.com, ccapi.financiamentos@gmail.com';

	            if ($specialistEmail) {
	                if ($origin === 'admin') {
	                    // Mensagem de verificação de segurança para criação manual pelo especialista
	                    $subject = "Verificação de Segurança: Proposta de $clientName";
	                    $msg = "
	                        <p>Olá <strong>$specialist</strong>,</p>
	                        <p>Este é um e-mail de <strong>verificação de segurança</strong> automático.</p>
	                        <div style='background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:6px;margin:16px 0;'>
	                            <p style='margin:0;'>Você adicionou uma proposta para o cliente <strong>$clientName</strong> em <strong>$dateNow</strong> pelo painel administrativo.</p>
	                        </div>
	                        <p>Se <strong>não foi você</strong> quem realizou esta operação, entre em contato com o suporte imediatamente.</p>
	                    ";
	                    sendNotificationEmail($specialistEmail, $subject, $msg);
	                    sendNotificationEmail($mainSupportEmail, "[Cópia] $subject", $msg);
	                } else {
	                    // Notificação padrão para propostas vindas do site (clientes)
	                    $subject = "Nova Proposta Recebida: $clientName";
	                    $msg = "
	                        <p>Olá <strong>$specialist</strong>,</p>
	                        <p>Uma <strong>nova proposta</strong> foi recebida pelo site/app para o cliente abaixo:</p>
	                        <table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:0.92rem;'>
	                            <tr>
	                                <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;width:40%;border:1px solid #e2e8f0;'>Cliente</td>
	                                <td style='padding:9px 12px;border:1px solid #e2e8f0;'><strong>$clientName</strong></td>
	                            </tr>
	                            <tr>
	                                <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Data de Recebimento</td>
	                                <td style='padding:9px 12px;border:1px solid #e2e8f0;'>$dateNow</td>
	                            </tr>
	                            <tr>
	                                <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Especialista</td>
	                                <td style='padding:9px 12px;border:1px solid #e2e8f0;'>$specialist</td>
	                            </tr>
	                        </table>
	                        <p>Acesse o painel administrativo para conferir todos os detalhes e dar andamento à proposta.</p>
	                    ";
	                    sendNotificationEmail($specialistEmail, $subject, $msg);
	                    sendNotificationEmail($mainSupportEmail, $subject, $msg);
	                }
	            } else if ($origin !== 'admin') {
	                // Se for do site e não tiver especialista definido ainda, manda só pro suporte
	                $subject = "Nova Proposta sem Especialista: $clientName";
	                $msg = "
	                    <p>Uma nova proposta foi recebida pelo <strong>site/app</strong> para o cliente <strong>$clientName</strong> em <strong>$dateNow</strong>.</p>
	                    <p style='color:#dc2626;'>⚠️ Nenhum especialista foi identificado para esta proposta. Verifique e atribua um responsável no painel.</p>
	                ";
	                sendNotificationEmail($mainSupportEmail, $subject, $msg);
	            }

            jsonResponse(true, [
                'message' => 'Proposta criada com sucesso e está em análise!',
                'proposal_id' => $proposalId
            ]);

        } catch (Exception $e) {
            logError("Erro ao criar proposta: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao criar proposta: ' . $e->getMessage());
        }
        break;

    // --- CASO: ATUALIZAR O STATUS DE UMA PROPOSTA ---
    case 'update_proposal_status':
        try {
            // Verifica se o ID da proposta e o status foram fornecidos
            if (empty($input['proposal_id']) || empty($input['status'])) {
                jsonResponse(false, null, "ID da proposta e status são obrigatórios");
            }

            $proposalId = (int)$input['proposal_id']; // Converte o ID da proposta para inteiro
            $status = sanitizeInput($input['status']); // Sanitiza o status
            // Obtém a observação se fornecida, senão usa null
            $observation = isset($input['observation']) ? sanitizeInput($input['observation']) : null;
            // Obtém o nome do banco se fornecido (para status formalizada)
            $bankName = isset($input['bank_name']) ? sanitizeInput($input['bank_name']) : null;

            // Define os status válidos permitidos para atualização
            $validStatuses = ['pending', 'approved', 'rejected', 'analyzing', 'formalizada'];
            if (!in_array($status, $validStatuses)) {
                jsonResponse(false, null, "Status inválido"); // Retorna erro se o status for inválido
            }

            // Prepara e executa a query para atualizar o status, observação e banco da proposta
            $stmt = $pdo->prepare("
                UPDATE proposals
                SET status = ?, observation = ?, bank_name = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $result = $stmt->execute([$status, $observation, $bankName, $proposalId]);

            // Verifica se a atualização foi bem-sucedida e se alguma linha foi afetada
            if ($result && $stmt->rowCount() > 0) {
                logError("Status da proposta #$proposalId atualizado para $status" . ($bankName ? " - Banco: $bankName" : "")); // Loga a ação
                jsonResponse(true, ['message' => 'Status atualizado com sucesso!']); // Retorna sucesso
            } else {
                jsonResponse(false, null, "Proposta não encontrada"); // Retorna erro se a proposta não for encontrada
            }

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao atualizar status: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: ATUALIZAR TODOS OS DETALHES DE UMA PROPOSTA (CORRIGIDO - SEM vehicle_year) ---
    case 'update_proposal_details':
        try {
            // Verifica se o ID da proposta foi fornecido
            if (empty($input['proposal_id'])) {
                jsonResponse(false, null, "ID da proposta é obrigatório");
            }

            $proposalId = (int)$input['proposal_id'];

            // Coletar todos os campos que serão atualizados (SEM vehicle_year)
            $fields = [
                'client_type' => sanitizeInput($input['client_type'] ?? 'pf'),
                'client_name' => sanitizeInput($input['client_name']),
                'client_email' => sanitizeInput($input['client_email']),
                'client_phone' => sanitizeInput($input['client_phone']),
                'client_document' => sanitizeInput($input['client_document']),
                'client_birth_date' => !empty($input['client_birth_date']) ? $input['client_birth_date'] : null,
                'company_opening_date' => !empty($input['company_opening_date']) ? $input['company_opening_date'] : null,
                'client_profession' => sanitizeInput($input['client_profession']),
                'client_income' => !empty($input['client_income']) ? (float)$input['client_income'] : null,
                'client_cep' => sanitizeInput($input['client_cep']),
                'client_address' => sanitizeInput($input['client_address']),
                'client_has_cnh' => sanitizeInput($input['client_has_cnh']),
                'vehicle_type' => sanitizeInput($input['vehicle_type']),
                'vehicle_brand' => sanitizeInput($input['vehicle_brand']),
                'vehicle_model' => sanitizeInput($input['vehicle_model']),
                'vehicle_year_manufacture' => !empty($input['vehicle_year_manufacture']) ? (int)$input['vehicle_year_manufacture'] : null,
                'vehicle_year_model' => !empty($input['vehicle_year_model']) ? (int)$input['vehicle_year_model'] : null,
                'vehicle_plate' => sanitizeInput($input['vehicle_plate']),
                'vehicle_value' => !empty($input['vehicle_value']) ? (float)$input['vehicle_value'] : null,
                'vehicle_condition' => sanitizeInput($input['vehicle_condition']),
                'finance_value' => !empty($input['finance_value']) ? (float)$input['finance_value'] : null,
                'down_payment' => !empty($input['down_payment']) ? (float)$input['down_payment'] : null,
                'product_type' => sanitizeInput($input['product_type']),
                'specialist' => sanitizeInput($input['specialist']),
                'indicated_by' => sanitizeInput($input['indicated_by']),
                'data_proposta' => !empty($input['data_proposta']) ? sanitizeInput($input['data_proposta']) : date('Y-m-d')
            ];

            // Construir a query de atualização (SEM vehicle_year)
            $stmt = $pdo->prepare("
                UPDATE proposals SET
                    client_type = ?,
                    client_name = ?,
                    client_email = ?,
                    client_phone = ?,
                    client_document = ?,
                    client_birth_date = ?,
                    company_opening_date = ?,
                    client_profession = ?,
                    client_income = ?,
                    client_cep = ?,
                    client_address = ?,
                    client_has_cnh = ?,
                    vehicle_type = ?,
                    vehicle_brand = ?,
                    vehicle_model = ?,
                    vehicle_year_manufacture = ?,
                    vehicle_year_model = ?,
                    vehicle_plate = ?,
                    vehicle_value = ?,
                    vehicle_condition = ?,
                    finance_value = ?,
                    down_payment = ?,
                    product_type = ?,
                    specialist = ?,
                    indicated_by = ?,
                    data_proposta = ?,
                    client_naturalidade = ?,
                    client_rg = ?,
                    client_mother_name = ?,
                    client_father_name = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");

            // Primeiro, verificar se a proposta existe
            $checkStmt = $pdo->prepare("SELECT id FROM proposals WHERE id = ?");
            $checkStmt->execute([$proposalId]);

            if (!$checkStmt->fetch()) {
                jsonResponse(false, null, "Proposta não encontrada");
            }

            $result = $stmt->execute([
                $fields['client_type'],
                $fields['client_name'],
                $fields['client_email'],
                $fields['client_phone'],
                $fields['client_document'],
                $fields['client_birth_date'],
                $fields['company_opening_date'],
                $fields['client_profession'],
                $fields['client_income'],
                $fields['client_cep'],
                $fields['client_address'],
                $fields['client_has_cnh'],
                $fields['vehicle_type'],
                $fields['vehicle_brand'],
                $fields['vehicle_model'],
                $fields['vehicle_year_manufacture'],
                $fields['vehicle_year_model'],
                $fields['vehicle_plate'],
                $fields['vehicle_value'],
                $fields['vehicle_condition'],
                $fields['finance_value'],
                $fields['down_payment'],
                $fields['product_type'],
                $fields['specialist'],
                $fields['indicated_by'],
                $fields['data_proposta'],
                $fields['client_naturalidade'],
                $fields['client_rg'],
                $fields['client_mother_name'],
                $fields['client_father_name'],
                $proposalId
            ]);

            // Verifica se a atualização foi bem-sucedida (retorna sucesso mesmo sem mudanças)
            if ($result) {
                $rowsAffected = $stmt->rowCount();
                if ($rowsAffected > 0) {
                    logError("Proposta #$proposalId atualizada completamente ($rowsAffected campos alterados)");
                    jsonResponse(true, ['message' => 'Proposta atualizada com sucesso!']);
                } else {
                    logError("Proposta #$proposalId - UPDATE executado mas nenhum campo foi alterado");
                    jsonResponse(true, ['message' => 'Proposta atualizada com sucesso!']);
                }
            } else {
                jsonResponse(false, null, "Erro ao executar atualização");
            }

        } catch (PDOException $e) {
            logError("Erro ao atualizar proposta: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    // --- CASO: OBTER LISTA DE USUÁRIOS (DO SISTEMA PRINCIPAL) ---
    case 'get_users_list':
        try {
            // Seleciona o ID, nome e email de todos os usuários, ordenados por nome
            $stmt = $pdo->query("
                SELECT id, name, email
                FROM users
                ORDER BY name ASC
            ");
            $users = $stmt->fetchAll(); // Obtém todos os usuários
            jsonResponse(true, ['users' => $users]); // Retorna a lista de usuários
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar usuários: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER PROPOSTAS ASSOCIADAS A UM USUÁRIO ESPECÍFICO ---
    case 'get_user_proposals':
        try {
            // Verifica se o ID do usuário foi fornecido
            if (empty($input['user_id'])) {
                jsonResponse(false, null, "ID do usuário não especificado");
            }

            $userId = (int)$input['user_id']; // Converte o ID do usuário para inteiro

            // Seleciona propostas associadas a um usuário, mostrando informações básicas, ordenadas por data de criação
            $stmt = $pdo->prepare("
                SELECT id, client_name, vehicle_brand, vehicle_model, status
                FROM proposals
                WHERE user_id = ?
                ORDER BY created_at DESC
            ");
            $stmt->execute([$userId]); // Executa a query com o ID do usuário
            $proposals = $stmt->fetchAll(); // Obtém as propostas

            jsonResponse(true, ['proposals' => $proposals]); // Retorna as propostas do usuário
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar propostas do usuário: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: CRIAR UMA NOVA CONVERSA DE CHAT ---
    case 'create_new_chat':
        try {
            // Verifica se os IDs de usuário, proposta e admin, e a mensagem inicial (opcional) foram fornecidos
            if (empty($input['user_id']) || empty($input['proposal_id']) || empty($input['admin_id'])) {
                jsonResponse(false, null, "Dados obrigatórios não fornecidos");
            }

            $userId = (int)$input['user_id'];
            $proposalId = (int)$input['proposal_id'];
            $adminId = (int)$input['admin_id'];
            // Sanitiza a mensagem inicial se existir
            $initialMessage = isset($input['initial_message']) ? sanitizeInput($input['initial_message']) : null;

            $pdo->beginTransaction(); // Inicia uma transação para garantir atomicidade das operações

            try {
                // Verifica se já existe uma conversa ativa para esta proposta e usuário
                $stmt = $pdo->prepare("
                    SELECT id FROM chat_conversations
                    WHERE proposal_id = ? AND user_id = ?
                ");
                $stmt->execute([$proposalId, $userId]);
                $existingConversation = $stmt->fetch(); // Obtém a conversa existente se houver

                $conversationId = null; // Inicializa o ID da conversa

                if ($existingConversation) {
                    $conversationId = $existingConversation['id']; // Usa o ID da conversa existente
                } else {
                    // Se não existir, cria uma nova entrada em `chat_conversations`
                    $stmt = $pdo->prepare("
                        INSERT INTO chat_conversations (proposal_id, user_id, status, created_at, updated_at)
                        VALUES (?, ?, 'active', NOW(), NOW())
                    ");
                    $stmt->execute([$proposalId, $userId]);
                    $conversationId = $pdo->lastInsertId(); // Obtém o ID da nova conversa
                }

                // Se uma mensagem inicial foi fornecida, insere-a na tabela `chat_messages`
                if ($initialMessage) {
                    $stmt = $pdo->prepare("
                        INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message, created_at)
                        VALUES (?, 'admin', ?, ?, NOW())
                    ");
                    $stmt->execute([$conversationId, $adminId, $initialMessage]);

                    // Atualiza o `updated_at` da conversa para refletir a nova mensagem
                    $stmt = $pdo->prepare("
                        UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?
                    ");
                    $stmt->execute([$conversationId]);
                }

                // Busca o nome do usuário para incluir na resposta
                $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
                $stmt->execute([$userId]);
                $userName = $stmt->fetchColumn() ?: 'Usuário'; // Define como 'Usuário' se não encontrado

                $pdo->commit(); // Confirma a transação se todas as operações foram bem-sucedidas

                // Retorna sucesso com o ID da conversa, nome do usuário e mensagem de confirmação
                jsonResponse(true, [
                    'conversation_id' => $conversationId,
                    'user_name' => $userName,
                    'message' => 'Nova conversa criada com sucesso!'
                ]);

            } catch (Exception $e) {
                $pdo->rollback(); // Desfaz as alterações se ocorrer algum erro na transação
                throw $e; // Relança a exceção para ser capturada pelo bloco catch externo
            }

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados durante a criação da conversa
            logError("Erro ao criar conversa: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER LISTA DE CONVERSAS DE CHAT PARA UM ADMINISTRADOR ---
    case 'get_admin_chats':
        try {
            $userId = isset($input['user_id']) ? (int)$input['user_id'] : null; // ID do usuário logado (opcional)
            $userType = isset($input['user_type']) ? sanitizeInput($input['user_type']) : null; // Tipo de usuário logado (opcional)

            $whereClause = ""; // Cláusula WHERE para filtros
            $params = []; // Parâmetros para a query preparada

            // Filtra as conversas por especialista se o usuário logado não for um administrador geral
            if ($userType && $userType !== 'administrador') {
                $whereClause = " AND p.specialist = ?"; // Adiciona a condição de filtro
                $params[] = $userType; // Adiciona o tipo de usuário como parâmetro
            }

            // Consulta para obter as conversas ativas, incluindo contagem de mensagens não lidas
            $stmt = $pdo->prepare("
                SELECT
                    cc.id as conversation_id,
                    cc.proposal_id,
                    cc.user_id,
                    cc.status,
                    cc.updated_at,
                    p.client_name,
                    p.specialist,
                    u.name as user_name,
                    (SELECT COUNT(*) FROM chat_messages
                     WHERE conversation_id = cc.id AND is_read = 0 AND sender_type = 'user') as unread_count
                FROM chat_conversations cc
                LEFT JOIN proposals p ON cc.proposal_id = p.id
                LEFT JOIN users u ON cc.user_id = u.id
                WHERE cc.status = 'active' $whereClause
                ORDER BY cc.updated_at DESC
            ");
            $stmt->execute($params); // Executa a query com os parâmetros (se houver)
            $chats = $stmt->fetchAll(); // Obtém todas as conversas

            jsonResponse(true, ['chats' => $chats]); // Retorna a lista de conversas
        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar chats: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER CONVERSA DE CHAT ASSOCIADA A UMA PROPOSTA ESPECÍFICA ---
    case 'get_chat_by_proposal':
        try {
            // Verifica se o ID da proposta foi fornecido
            if (empty($input['proposal_id'])) {
                jsonResponse(false, null, "ID da proposta é obrigatório");
            }

            $proposalId = (int)$input['proposal_id']; // Converte o ID da proposta para inteiro

            // Seleciona a conversa mais recente associada a uma proposta
            $stmt = $pdo->prepare("
                SELECT
                    cc.id as conversation_id,
                    cc.user_id,
                    u.name as user_name
                FROM chat_conversations cc
                LEFT JOIN users u ON cc.user_id = u.id
                WHERE cc.proposal_id = ?
                ORDER BY cc.updated_at DESC
                LIMIT 1
            ");
            $stmt->execute([$proposalId]); // Executa a query com o ID da proposta
            $chat = $stmt->fetch(); // Obtém o resultado

            if ($chat) {
                jsonResponse(true, $chat); // Retorna os detalhes da conversa
            } else {
                jsonResponse(false, null, "Nenhuma conversa encontrada"); // Retorna erro se nenhuma conversa for encontrada
            }

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar chat por proposta: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: ENVIAR MENSAGEM DE ADMINISTRADOR EM UMA CONVERSA ---
    case 'send_admin_message':
        try {
            // Obtém os dados da mensagem e sanitiza
            $conversationId = (int)$input['conversation_id'];
            $adminId = (int)$input['admin_id'];
            $message = sanitizeInput($input['message']);

            // Valida se os dados obrigatórios foram fornecidos
            if ($conversationId <= 0 || $adminId <= 0 || empty($message)) {
                jsonResponse(false, null, "Dados da mensagem são obrigatórios");
            }

            // Verifica se a conversa existe
            $stmt = $pdo->prepare("SELECT id FROM chat_conversations WHERE id = ?");
            $stmt->execute([$conversationId]);
            if ($stmt->rowCount() == 0) {
                jsonResponse(false, null, "Conversa não encontrada"); // Retorna erro se a conversa não existir
            }

            // Insere a nova mensagem na tabela `chat_messages` como enviada pelo administrador
            $stmt = $pdo->prepare("
                INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message, created_at)
                VALUES (?, 'admin', ?, ?, NOW())
            ");
            $stmt->execute([$conversationId, $adminId, $message]);

            // Atualiza o `updated_at` da conversa para indicar nova atividade
            $stmt = $pdo->prepare("
                UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?
            ");
            $stmt->execute([$conversationId]);

            jsonResponse(true, ['message' => 'Mensagem enviada com sucesso']); // Retorna sucesso

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao enviar mensagem: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // --- CASO: OBTER MENSAGENS DE UMA CONVERSA ESPECÍFICA ---
    case 'get_messages':
        try {
            $conversationId = (int)$input['conversation_id']; // Obtém o ID da conversa

            // Valida se o ID da conversa foi fornecido
            if ($conversationId <= 0) {
                jsonResponse(false, null, "ID da conversa é obrigatório");
            }

            // Consulta as mensagens de uma conversa, juntando nomes de remetentes (usuário ou administrador)
            $stmt = $pdo->prepare("
                SELECT
                    cm.id, cm.sender_type, cm.sender_id, cm.message, cm.is_read, cm.created_at,
                    CASE
                        WHEN cm.sender_type = 'user' THEN u.name
                        WHEN cm.sender_type = 'admin' THEN ua.name
                    END as sender_name
                FROM chat_messages cm
                LEFT JOIN users u ON cm.sender_type = 'user' AND cm.sender_id = u.id
                LEFT JOIN user_admin ua ON cm.sender_type = 'admin' AND cm.sender_id = ua.id
                WHERE cm.conversation_id = ?
                ORDER BY cm.created_at ASC
            ");
            $stmt->execute([$conversationId]); // Executa a query com o ID da conversa
            $messages = $stmt->fetchAll(); // Obtém todas as mensagens

            jsonResponse(true, ['messages' => $messages]); // Retorna as mensagens

        } catch (PDOException $e) {
            // Captura e loga erros de banco de dados
            logError("Erro ao buscar mensagens: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados");
        }
        break;

    // ============ CASOS PARA FINANCEIRO ============

    /**
     * Cria uma nova conta no módulo financeiro.
     */
    case 'create_bill':
        try {
            // Validar campos obrigatórios
            $requiredFields = ['nome_conta', 'valor', 'dia_pagamento', 'frequencia', 'categoria'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field]) || $input[$field] === '') {
                    jsonResponse(false, null, "Campo obrigatório: $field");
                }
            }

            // Sanitiza e converte os dados de entrada
            $nomeConta = sanitizeInput($input['nome_conta']);
            $valor = (float)$input['valor'];
            $diaPagamento = (int)$input['dia_pagamento'];
            $frequencia = sanitizeInput($input['frequencia']);
            $categoria = sanitizeInput($input['categoria']);
            $observacao = isset($input['observacao']) ? sanitizeInput($input['observacao']) : null;

            // Validações específicas
            if ($valor <= 0) {
                jsonResponse(false, null, "Valor deve ser maior que zero");
            }
            if ($diaPagamento < 1 || $diaPagamento > 31) {
                jsonResponse(false, null, "Dia de pagamento inválido (1-31)");
            }
            $validFrequencias = ['mensal', 'única'];
            if (!in_array($frequencia, $validFrequencias)) {
                jsonResponse(false, null, "Frequência inválida. Use 'mensal' ou 'única'.");
            }
            $validCategorias = ['Marketing', 'Alimentação', 'Limpeza', 'Viagens', 'Aluguel', 'Conta de Luz', 'Conta de Água', 'Equipamentos', 'Tecnologia', 'Móveis', 'Funcionários'];
            if (!in_array($categoria, $validCategorias)) {
                jsonResponse(false, null, "Categoria inválida. Use uma das opções: " . implode(', ', $validCategorias));
            }

            // Query para inserir a nova conta no banco de dados
            $stmt = $pdo->prepare("
                INSERT INTO financeiro (nome_conta, valor, dia_pagamento, frequencia, categoria, observacao, pago)
                VALUES (?, ?, ?, ?, ?, ?, FALSE)
            ");
            $result = $stmt->execute([$nomeConta, $valor, $diaPagamento, $frequencia, $categoria, $observacao]);

            if ($result) {
                $billId = $pdo->lastInsertId(); // Obtém o ID da conta recém-criada
                logError("Conta financeira criada: ID $billId - '$nomeConta'");
                jsonResponse(true, [
                    'message' => 'Conta criada com sucesso!',
                    'id' => $billId
                ]);
            } else {
                jsonResponse(false, null, "Erro ao criar conta financeira");
            }
        } catch (PDOException $e) {
            logError("Erro ao criar conta financeira: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    /**
     * Obtém a lista de todas as contas registradas no módulo financeiro.
     */
    case 'get_bills':
        try {
            // Query para selecionar todas as contas com informações relevantes
            $stmt = $pdo->query("
                SELECT id, nome_conta, valor, dia_pagamento, frequencia, categoria, observacao, pago, created_at, updated_at
                FROM financeiro
                ORDER BY created_at DESC
            ");
            $bills = $stmt->fetchAll(); // Obtém todas as contas
            jsonResponse(true, ['bills' => $bills]); // Retorna a lista de contas em JSON
        } catch (PDOException $e) {
            logError("Erro ao buscar contas financeiras: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    /**
     * Obtém os detalhes de uma conta específica pelo seu ID.
     */
    case 'get_bill':
        try {
            // Verifica se o ID da conta foi fornecido
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID da conta não especificado");
            }
            $billId = (int)$input['id']; // Converte o ID para inteiro

            // Query para selecionar os detalhes de uma conta específica
            $stmt = $pdo->prepare("SELECT * FROM financeiro WHERE id = ?");
            $stmt->execute([$billId]); // Executa a query com o ID
            $bill = $stmt->fetch(); // Obtém o resultado

            if ($bill) {
                jsonResponse(true, ['bill' => $bill]); // Retorna os detalhes da conta
            } else {
                jsonResponse(false, null, "Conta não encontrada"); // Retorna erro se a conta não for encontrada
            }
        } catch (PDOException $e) {
            logError("Erro ao buscar conta financeira: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    /**
     * Atualiza os detalhes de uma conta existente no módulo financeiro.
     */
    case 'update_bill':
        try {
            // Verifica se o ID da conta foi fornecido
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID da conta é obrigatório");
            }
            $billId = (int)$input['id']; // Converte o ID para inteiro

            // Verificar se a conta existe antes de tentar atualizar
            $checkStmt = $pdo->prepare("SELECT id FROM financeiro WHERE id = ?");
            $checkStmt->execute([$billId]);
            if (!$checkStmt->fetch()) {
                jsonResponse(false, null, "Conta não encontrada");
            }

            // Construir query dinâmica baseada nos campos fornecidos
            $updateFields = [];
            $params = [];

            // Adiciona campos à query de atualização se eles estiverem presentes na entrada
            if (isset($input['nome_conta'])) {
                $updateFields[] = "nome_conta = ?";
                $params[] = sanitizeInput($input['nome_conta']);
            }
            if (isset($input['valor'])) {
                $updateFields[] = "valor = ?";
                $params[] = (float)$input['valor'];
            }
            if (isset($input['dia_pagamento'])) {
                $updateFields[] = "dia_pagamento = ?";
                $params[] = (int)$input['dia_pagamento'];
            }
            if (isset($input['frequencia'])) {
                $updateFields[] = "frequencia = ?";
                $params[] = sanitizeInput($input['frequencia']);
            }
            if (isset($input['categoria'])) {
                $updateFields[] = "categoria = ?";
                $params[] = sanitizeInput($input['categoria']);
            }
            if (isset($input['observacao'])) {
                $updateFields[] = "observacao = ?";
                $params[] = sanitizeInput($input['observacao']);
            }
            if (isset($input['pago'])) { // Verifica se o campo 'pago' foi enviado
                $updateFields[] = "pago = ?";
                // Converte o valor para booleano (0 ou 1)
                $params[] = $input['pago'] ? 1 : 0;
            }

            // Se nenhum campo válido para atualização foi fornecido, retorna erro
            if (empty($updateFields)) {
                jsonResponse(false, null, "Nenhum campo válido para atualizar foi fornecido");
            }

            // Adiciona o ID da conta aos parâmetros para a cláusula WHERE
            $params[] = $billId;

            // Monta a query SQL completa para atualização
            $sql = "UPDATE financeiro SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";

            $stmt = $pdo->prepare($sql);
            $result = $stmt->execute($params);

            if ($result) {
                logError("Conta financeira #$billId atualizada");
                jsonResponse(true, ['message' => 'Conta atualizada com sucesso!']);
            } else {
                // Este else geralmente não é atingido se a execução for bem-sucedida, mas é bom ter como fallback
                jsonResponse(false, null, "Erro ao executar a atualização da conta");
            }
        } catch (PDOException $e) {
            logError("Erro ao atualizar conta financeira: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    /**
     * Deleta uma conta específica do módulo financeiro pelo seu ID.
     */
    case 'delete_bill':
        try {
            // Verifica se o ID da conta foi fornecido
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID da conta não especificado");
            }
            $billId = (int)$input['id']; // Converte o ID para inteiro

            // Query para deletar a conta do banco de dados
            $stmt = $pdo->prepare("DELETE FROM financeiro WHERE id = ?");
            $result = $stmt->execute([$billId]);

            // Verifica se a deleção foi bem-sucedida e se alguma linha foi afetada
            if ($result && $stmt->rowCount() > 0) {
                logError("Conta financeira #$billId deletada");
                jsonResponse(true, ['message' => 'Conta deletada com sucesso!']);
            } else {
                jsonResponse(false, null, "Conta não encontrada"); // Retorna erro se a conta não for encontrada
            }
        } catch (PDOException $e) {
            logError("Erro ao deletar conta financeira: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    /**
     * Obtém estatísticas gerais do módulo financeiro.
     */
    case 'get_bills_stats':
        try {
            // Consulta o número de contas pagas
            $stmt = $pdo->query("SELECT COUNT(*) FROM financeiro WHERE pago = TRUE");
            $contasPagas = (int)$stmt->fetchColumn();

            // Consulta o número de contas a pagar
            $stmt = $pdo->query("SELECT COUNT(*) FROM financeiro WHERE pago = FALSE");
            $contasAPagar = (int)$stmt->fetchColumn();

            // CORRIGIDO: Consulta a soma dos valores de TODAS as contas (não apenas mensais)
            $stmt = $pdo->query("SELECT SUM(valor) FROM financeiro");
            $gastoMensal = (float)$stmt->fetchColumn();

            // Retorna as estatísticas calculadas
            jsonResponse(true, [
                'contas_pagas' => $contasPagas,
                'contas_a_pagar' => $contasAPagar,
                'gasto_mensal' => $gastoMensal
            ]);
        } catch (PDOException $e) {
            logError("Erro ao buscar estatísticas financeiras: " . $e->getMessage());
            jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
        }
        break;

    // ==================== MÓDULO DE PLANILHAS - CORRIGIDO E FUNCIONAL ====================

    /**
     * Upload de planilha SIMPLIFICADO E FUNCIONAL
     * Salva o arquivo diretamente no servidor sem processar conteúdo
     */
    case 'upload_spreadsheet':
        try {
            // Garantir que a tabela existe
            ensurePlanilhasTable($pdo);

            // Verificar se o arquivo foi enviado
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $errorMsg = "Erro ao fazer upload do arquivo";
                if (isset($_FILES['file']['error'])) {
                    switch ($_FILES['file']['error']) {
                        case UPLOAD_ERR_INI_SIZE:
                        case UPLOAD_ERR_FORM_SIZE:
                            $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                            break;
                        case UPLOAD_ERR_NO_FILE:
                            $errorMsg = "Nenhum arquivo foi enviado";
                            break;
// ==================== MÓDULO DE NOTAS FISCAIS - NOVOS CASOS ====================

case 'get_notas_fiscais_stats':
    try {
        // ✅ CONSULTA REAL DO BANCO DE DADOS
        
        // Total de notas fiscais
        $stmtTotal = $pdo->query("SELECT COUNT(*) as total FROM notas_fiscais");
        $totalNotas = (int)$stmtTotal->fetchColumn();

        // Contar notas XML
        $stmtXML = $pdo->query("SELECT COUNT(*) as total FROM notas_fiscais WHERE arquivo_tipo = 'xml'");
        $notasXML = (int)$stmtXML->fetchColumn();

        // Contar notas PDF
        $stmtPDF = $pdo->query("SELECT COUNT(*) as total FROM notas_fiscais WHERE arquivo_tipo = 'pdf'");
        $notasPDF = (int)$stmtPDF->fetchColumn();

        // Notas do mês atual
        $stmtMes = $pdo->query("
            SELECT COUNT(*) as total FROM notas_fiscais 
            WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) 
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
        ");
        $notasMesAtual = (int)$stmtMes->fetchColumn();

        // Log das estatísticas
        logError("Estatísticas: Total=$totalNotas, XML=$notasXML, PDF=$notasPDF, Mês=$notasMesAtual");

        jsonResponse(true, [
            'total_notas' => $totalNotas,
            'notas_xml' => $notasXML,
            'notas_pdf' => $notasPDF,
            'notas_mes_atual' => $notasMesAtual
        ]);
    } catch (Exception $e) {
        logError("Erro ao buscar estatísticas de notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar estatísticas: ' . $e->getMessage());
    }
    break;
    
case 'list_notas_fiscais':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                data,
                email,
                cpf,
                local,
                arquivo_nome,
                arquivo_tamanho,
                arquivo_tipo,
                created_at
            FROM notas_fiscais
            ORDER BY created_at DESC
        ");
        $notasFiscais = $stmt->fetchAll();
        
        jsonResponse(true, ['notas_fiscais' => $notasFiscais]);
    } catch (Exception $e) {
        logError("Erro ao listar notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao listar notas fiscais: ' . $e->getMessage());
    }
    break;

case 'upload_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        if (empty($_POST['local'])) {
            jsonResponse(false, null, "O campo Local é obrigatório");
        }
        
        $nomeCliente = isset($_POST['nome_cliente']) ? sanitizeInput($_POST['nome_cliente']) : null;
        $telefone = isset($_POST['telefone']) ? sanitizeInput($_POST['telefone']) : null;
        $data = isset($_POST['data']) ? sanitizeInput($_POST['data']) : null;
        $email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : null;
        $cpf = isset($_POST['cpf']) ? sanitizeInput($_POST['cpf']) : null;
        $local = sanitizeInput($_POST['local']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_PARTIAL:
                        $errorMsg = "O upload do arquivo foi parcial";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg = "Erro desconhecido no upload: " . $_FILES['arquivo']['error'];
                        break;
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = basename($file['name']);
        $fileTmpName = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if ($fileSize > 50 * 1024 * 1024) { // 50MB
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        if ($fileExt !== 'pdf' && $fileExt !== 'xml') {
            jsonResponse(false, null, "Apenas arquivos PDF e XML são permitidos");
        }
        
        $uploadDir = 'uploads/notas_fiscais/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $newFileName = uniqid('nf_', true) . '.' . $fileExt;
        $fileDest = $uploadDir . $newFileName;
        
        if (move_uploaded_file($fileTmpName, $fileDest)) {
            $stmt = $pdo->prepare("
                INSERT INTO notas_fiscais 
                (nome_cliente, telefone, data, email, cpf, local, arquivo_path, arquivo_nome, arquivo_tamanho, arquivo_tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $nomeCliente, 
                $telefone, 
                $data, 
                $email, 
                $cpf, 
                $local, 
                $fileDest, 
                $fileName, 
                $fileSize, 
                $fileExt
            ]);
            
            jsonResponse(true, ['message' => 'Nota Fiscal enviada com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao mover o arquivo para o destino");
        }
    } catch (Exception $e) {
        logError("Erro no upload de nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro no upload de nota fiscal: ' . $e->getMessage());
    }
    break;

case 'get_nota_fiscal_details':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT * FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            jsonResponse(true, ['nota_fiscal' => $notaFiscal]);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao buscar detalhes da nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar detalhes da nota fiscal: ' . $e->getMessage());
    }
    break;

case 'download_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT arquivo_path, arquivo_nome FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            $filePath = $notaFiscal['arquivo_path'];
            $fileName = $notaFiscal['arquivo_nome'];
            
            if (file_exists($filePath)) {
                header('Content-Description: File Transfer');
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . $fileName . '"');
                header('Expires: 0');
                header('Cache-Control: must-revalidate');
                header('Pragma: public');
                header('Content-Length: ' . filesize($filePath));
                ob_clean();
                flush();
                readfile($filePath);
                exit;
            } else {
                jsonResponse(false, null, "Arquivo não encontrado no servidor");
            }
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao baixar nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao baixar nota fiscal: ' . $e->getMessage());
    }
    break;

case 'delete_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        // 1. Obter o caminho do arquivo para exclusão
        $stmt = $pdo->prepare("SELECT arquivo_path FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            // 2. Excluir o registro do banco de dados
            $stmtDelete = $pdo->prepare("DELETE FROM notas_fiscais WHERE id = ?");
            $stmtDelete->execute([$notaFiscalId]);
            
            // 3. Excluir o arquivo físico
            $filePath = $notaFiscal['arquivo_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            jsonResponse(true, ['message' => 'Nota Fiscal excluída com sucesso!']);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao excluir nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao excluir nota fiscal: ' . $e->getMessage());
    }
    break;

// ==================== MÓDULO DE CONTRATOS - NOVOS CASOS ====================

case 'get_contratos_stats':
    try {
        
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM contratos_upload");
        $totalContratos = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM contratos_upload 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $contratosRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtClientes = $pdo->query("SELECT COUNT(DISTINCT nome_cliente) FROM contratos_upload");
        $clientesUnicos = (int)$stmtClientes->fetchColumn();
        
        jsonResponse(true, [
            'total_contratos' => $totalContratos,
            'contratos_recentes' => $contratosRecentes,
            'clientes_unicos' => $clientesUnicos
        ]);
    } catch (PDOException $e) {
        logError("Erro ao buscar estatísticas de contratos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar estatísticas");
    }
    break;

case 'list_contratos':
    try {
        
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at
            FROM contratos_upload
            ORDER BY created_at DESC
        ");
        $contratos = $stmt->fetchAll();
        
        jsonResponse(true, ['contratos' => $contratos]);
    } catch (PDOException $e) {
        logError("Erro ao listar contratos: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao listar contratos: ' . $e->getMessage());
    }
    break;

case 'upload_contrato':
    try {
        
        
        if (empty($_POST['nome_cliente']) || empty($_POST['telefone'])) {
            jsonResponse(false, null, "Nome do cliente e telefone são obrigatórios");
        }
        
        $nomeCliente = sanitizeInput($_POST['nome_cliente']);
        $telefone = sanitizeInput($_POST['telefone']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    

default:
                        $errorMsg .= " (código de erro: " . $_FILES['arquivo']['error'] . ")";
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = $file['name'];
        $fileTmp = $file['tmp_name'];
        $fileSize = $file['size'];
        
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            jsonResponse(false, null, "Apenas arquivos PDF são permitidos");
        }
        
        if ($fileSize > 50 * 1024 * 1024) {
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        $uploadDir = __DIR__ . '/uploads/contratos/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                jsonResponse(false, null, "Erro ao criar diretório de upload");
            }
        }
        
        $nomeArquivo = uniqid() . '_' . time() . '.pdf';
        $caminhoCompleto = $uploadDir . $nomeArquivo;
        
        if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
            jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
        }
        
        $caminhoRelativo = 'uploads/contratos/' . $nomeArquivo;
        
        $stmt = $pdo->prepare("
            INSERT INTO contratos_upload (nome_cliente, telefone, arquivo_path, arquivo_nome, arquivo_tamanho, specialist_key)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([$nomeCliente, $telefone, $caminhoRelativo, $fileName, $fileSize, $specialistKey]);
        
        if ($result) {
            $contratoId = $pdo->lastInsertId();
            logError("Contrato adicionado: ID $contratoId - Cliente: $nomeCliente");
            jsonResponse(true, [
                'message' => 'Contrato adicionado com sucesso!',
                'id' => $contratoId
            ]);
        } else {
            if (file_exists($caminhoCompleto)) {
                unlink($caminhoCompleto);
            }
            jsonResponse(false, null, "Erro ao salvar contrato no banco de dados");
        }
        
    } catch (Exception $e) {
        logError("Erro ao fazer upload de contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar contrato: " . $e->getMessage());
    }
    break;

case 'get_contrato_details':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_path,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at,
                updated_at
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if ($contrato) {
            jsonResponse(true, ['contrato' => $contrato]);
        } else {
            jsonResponse(false, null, "Contrato não encontrado");
        }
    } catch (PDOException $e) {
        logError("Erro ao buscar detalhes do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar detalhes do contrato");
    }
    break;

case 'download_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT arquivo_path, arquivo_nome
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        
        if (!file_exists($caminhoArquivo)) {
            logError("Arquivo não encontrado: " . $caminhoArquivo);
            jsonResponse(false, null, "Arquivo não encontrado no servidor");
        }
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $contrato['arquivo_nome'] . '"');
        header('Content-Length: ' . filesize($caminhoArquivo));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($caminhoArquivo);
        exit;
        
    } catch (Exception $e) {
        logError("Erro ao fazer download do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao fazer download do contrato");
    }
    break;

case 'delete_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT arquivo_path FROM contratos_upload WHERE id = ?");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        if (file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        
        $stmt = $pdo->prepare("DELETE FROM contratos_upload WHERE id = ?");
        $result = $stmt->execute([$contratoId]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Contrato #$contratoId deletado");
            jsonResponse(true, ['message' => 'Contrato deletado com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao deletar contrato");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao deletar contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao deletar contrato");
        }
    break;



default:
                            $errorMsg .= " (código de erro: " . $_FILES['file']['error'] . ")";
                    }
                }
                jsonResponse(false, null, $errorMsg);
            }

            $file = $_FILES['file'];
            $fileName = $file['name'];
            $fileTmp = $file['tmp_name'];
            $fileSize = $file['size'];

            // Verificar extensão
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            if (!in_array($ext, ['xlsx', 'xls', 'csv'])) {
                jsonResponse(false, null, "Apenas arquivos Excel (.xlsx, .xls) ou CSV são permitidos");
            }

            // Nome sem extensão (será usado como identificador)
            $nomeBase = pathinfo($fileName, PATHINFO_FILENAME);

            // Criar diretório se não existir
            $uploadDir = __DIR__ . '/uploads/planilhas/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Verificar se já existe planilha com mesmo nome
            $stmt = $pdo->prepare("SELECT id, caminho_arquivo FROM planilhas WHERE nome = ?");
            $stmt->execute([$nomeBase]);
            $exists = $stmt->fetch();

            $overwrite = isset($_POST['overwrite']) && $_POST['overwrite'] === 'true';

            if ($exists && !$overwrite) {
                jsonResponse(false, [
                    'exists' => true,
                    'message' => "Já existe uma planilha com o nome '$nomeBase'. Deseja sobrescrever?"
                ], null);
            }

            // Gerar nome único para o arquivo (evitar conflitos no sistema de arquivos)
            $nomeArquivo = uniqid() . '_' . time() . '.' . $ext;
            $caminhoCompleto = $uploadDir . $nomeArquivo;

            // Mover arquivo para o destino
            if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
                jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
            }

            // Caminho relativo para salvar no banco
            $caminhoRelativo = 'uploads/planilhas/' . $nomeArquivo;

            if ($exists) {
                // Deletar arquivo antigo
                if (file_exists(__DIR__ . '/' . $exists['caminho_arquivo'])) {
                    unlink(__DIR__ . '/' . $exists['caminho_arquivo']);
                }

                // Atualizar registro no banco
                $stmt = $pdo->prepare("
                    UPDATE planilhas
                    SET nome_original = ?, caminho_arquivo = ?, tamanho = ?, extensao = ?, updated_at = NOW()
                    WHERE nome = ?
                ");
                $stmt->execute([$fileName, $caminhoRelativo, $fileSize, $ext, $nomeBase]);
                $message = "Planilha sobrescrita com sucesso";
                $planilhaId = $exists['id'];
            } else {
                // Inserir novo registro
                $stmt = $pdo->prepare("
                    INSERT INTO planilhas (nome, nome_original, caminho_arquivo, tamanho, extensao)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt->execute([$nomeBase, $fileName, $caminhoRelativo, $fileSize, $ext]);
                $message = "Planilha importada com sucesso";
                $planilhaId = $pdo->lastInsertId();
            }

            logError("Planilha '$nomeBase' salva/atualizada (ID: $planilhaId)");
            jsonResponse(true, [
                'message' => $message,
                'id' => $planilhaId,
                'nome' => $nomeBase,
                'tamanho' => round($fileSize / 1024, 2) . ' KB'
            ]);

        } catch (Exception $e) {
            logError("Erro ao processar planilha: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao processar planilha: " . $e->getMessage());
        }
        break;

    /**
     * Lista todas as planilhas salvas
     */
    case 'list_spreadsheets':
        try {
            $stmt = $pdo->query("
                SELECT id, nome, nome_original, tamanho, extensao,
                       ROUND(tamanho / 1024, 2) as tamanho_kb,
                       0 as num_colunas,
                       0 as num_linhas,
                       uploaded_at, updated_at
                FROM planilhas
                ORDER BY updated_at DESC
            ");

            $spreadsheets = $stmt->fetchAll();
            jsonResponse(true, ['spreadsheets' => $spreadsheets]);

        } catch (PDOException $e) {
            logError("Erro ao listar planilhas: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao listar planilhas");
        }
        break;

    /**
     * Baixar planilha original
     */
    case 'download_spreadsheet':
        try {
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID da planilha não especificado");
            }

            $id = (int)$input['id'];
            $stmt = $pdo->prepare("SELECT * FROM planilhas WHERE id = ?");
            $stmt->execute([$id]);
            $planilha = $stmt->fetch();

            if (!$planilha) {
                jsonResponse(false, null, "Planilha não encontrada");
            }

            $caminhoArquivo = __DIR__ . '/' . $planilha['caminho_arquivo'];

            if (!file_exists($caminhoArquivo)) {
                jsonResponse(false, null, "Arquivo não encontrado no servidor");
            }

            // Definir headers para download
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $planilha['nome_original'] . '"');
            header('Content-Length: ' . filesize($caminhoArquivo));
            header('Cache-Control: must-revalidate');
            header('Pragma: public');

            // Enviar arquivo
            readfile($caminhoArquivo);
            exit;

        } catch (Exception $e) {
            logError("Erro ao baixar planilha: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao baixar planilha");
        }
        break;

    /**
     * Renomear planilha
     */
    case 'rename_spreadsheet':
        try {
            if (empty($input['id']) || empty($input['novo_nome'])) {
                jsonResponse(false, null, "ID e novo nome são obrigatórios");
            }

            $id = (int)$input['id'];
            $novoNome = sanitizeInput($input['novo_nome']);

            // Verificar se novo nome já existe
            $stmt = $pdo->prepare("SELECT id FROM planilhas WHERE nome = ? AND id != ?");
            $stmt->execute([$novoNome, $id]);

            if ($stmt->rowCount() > 0) {
                jsonResponse(false, null, "Já existe uma planilha com este nome");
            }

            // Atualizar nome
            $stmt = $pdo->prepare("UPDATE planilhas SET nome = ?, updated_at = NOW() WHERE id = ?");
            $result = $stmt->execute([$novoNome, $id]);

            if ($result) {
                logError("Planilha #$id renomeada para '$novoNome'");
                jsonResponse(true, ['message' => 'Planilha renomeada com sucesso']);
            } else {
                jsonResponse(false, null, "Erro ao renomear planilha");
            }

        } catch (PDOException $e) {
            logError("Erro ao renomear planilha: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao renomear planilha");
        }
        break;

    /**
     * Deletar planilha
     */
    case 'delete_spreadsheet':
        try {
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID da planilha não especificado");
            }

            $id = (int)$input['id'];

            // Buscar informações da planilha
            $stmt = $pdo->prepare("SELECT caminho_arquivo FROM planilhas WHERE id = ?");
            $stmt->execute([$id]);
            $planilha = $stmt->fetch();

            if (!$planilha) {
                jsonResponse(false, null, "Planilha não encontrada");
            }

            // Deletar arquivo físico
            $caminhoArquivo = __DIR__ . '/' . $planilha['caminho_arquivo'];
            if (file_exists($caminhoArquivo)) {
                unlink($caminhoArquivo);
            }

            // Deletar registro do banco
            $stmt = $pdo->prepare("DELETE FROM planilhas WHERE id = ?");
            $result = $stmt->execute([$id]);

            if ($result) {
                logError("Planilha #$id deletada");
                jsonResponse(true, ['message' => 'Planilha deletada com sucesso']);
            } else {
                jsonResponse(false, null, "Erro ao deletar planilha");
            }

        } catch (PDOException $e) {
            logError("Erro ao deletar planilha: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao deletar planilha");
        }
        break;

    // ==================== MÓDULO DE DOCUMENTOS - NOVO ====================

    /**
     * NOVO: Listar todos os documentos agrupados por cliente
     * Retorna lista de clientes com contagem de documentos
     */
    case 'get_client_documents':
        try {
            // Obter parâmetro de filtro (opcional)
            $search = isset($input['search']) ? sanitizeInput($input['search']) : '';

            // Query base
            $sql = "
                SELECT 
                    client_name,
                    COUNT(*) as document_count,
                    MAX(uploaded_at) as last_upload
                FROM proposal_documents
            ";

            // Adicionar filtro se houver busca
            $params = [];
            if (!empty($search)) {
                $sql .= " WHERE client_name LIKE ?";
                $params[] = '%' . $search . '%';
            }

            // Agrupar por cliente
            $sql .= " GROUP BY client_name ORDER BY last_upload DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $clients = $stmt->fetchAll();

            // Obter estatísticas gerais
            $stmtTotal = $pdo->query("SELECT COUNT(*) FROM proposal_documents");
            $totalDocuments = (int)$stmtTotal->fetchColumn();

            $stmtClients = $pdo->query("SELECT COUNT(DISTINCT client_name) FROM proposal_documents");
            $totalClients = (int)$stmtClients->fetchColumn();

            jsonResponse(true, [
                'clients' => $clients,
                'total_documents' => $totalDocuments,
                'total_clients' => $totalClients
            ]);

        } catch (PDOException $e) {
            logError("Erro ao buscar clientes com documentos: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar documentos");
        }
        break;

    /**
     * NOVO: Obter todos os documentos de um cliente específico
     */
    case 'get_client_documents':
        try {
            $search = isset($input['search']) ? sanitizeInput($input['search']) : '';

            $sql = "
                SELECT
                    client_name,
                    COUNT(*) as document_count,
                    MAX(uploaded_at) as last_upload
                FROM proposal_documents
            ";

            $params = [];
            if (!empty($search)) {
                $sql .= " WHERE client_name LIKE ?";
                $params[] = '%' . $search . '%';
            }

            $sql .= " GROUP BY client_name ORDER BY last_upload DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $clients = $stmt->fetchAll();

            $stmtTotal = $pdo->query("SELECT COUNT(*) FROM proposal_documents");
            $totalDocuments = (int)$stmtTotal->fetchColumn();

            $stmtClients = $pdo->query("SELECT COUNT(DISTINCT client_name) FROM proposal_documents");
            $totalClients = (int)$stmtClients->fetchColumn();

            jsonResponse(true, [
                'clients' => $clients,
                'total_documents' => $totalDocuments,
                'total_clients' => $totalClients
            ]);

        } catch (PDOException $e) {
            logError("Erro ao buscar clientes com documentos: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar documentos");
        }
        break;

    /**
     * NOVO: Obter documentos filtrados por especialista
     */
    case 'list_proposal_documents':
        try {
            $specialistField = isset($input['specialist_field']) ? sanitizeInput($input['specialist_field']) : '';
            $search = isset($input['search']) ? sanitizeInput($input['search']) : '';

            // Query para buscar documentos com JOIN em proposals para filtrar por specialist
            $sql = "
                SELECT 
                    pd.id,
                    pd.proposal_id,
                    pd.client_name,
                    pd.file_name,
                    pd.file_path,
                    pd.file_size,
                    pd.uploaded_at,
                    p.specialist
                FROM proposal_documents pd
                INNER JOIN proposals p ON pd.proposal_id = p.id
                WHERE 1=1
            ";

            $params = [];
            
            // Filtrar por especialista se fornecido
            if (!empty($specialistField)) {
                $sql .= " AND p.specialist = ?";
                $params[] = $specialistField;
            }
            
            // Filtrar por busca de nome do cliente se fornecido
            if (!empty($search)) {
                $sql .= " AND pd.client_name LIKE ?";
                $params[] = '%' . $search . '%';
            }

            $sql .= " ORDER BY pd.uploaded_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Obter estatísticas
            $sqlStats = "
                SELECT 
                    COUNT(DISTINCT pd.id) as total_documents,
                    COUNT(DISTINCT pd.client_name) as total_clients
                FROM proposal_documents pd
                INNER JOIN proposals p ON pd.proposal_id = p.id
                WHERE 1=1
            ";
            
            $statsParams = [];
            if (!empty($specialistField)) {
                $sqlStats .= " AND p.specialist = ?";
                $statsParams[] = $specialistField;
            }

            $stmtStats = $pdo->prepare($sqlStats);
            $stmtStats->execute($statsParams);
            $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);

            jsonResponse(true, [
                'documents' => $documents,
                'total_documents' => (int)$stats['total_documents'],
                'total_clients' => (int)$stats['total_clients']
            ]);

        } catch (PDOException $e) {
            logError("Erro ao listar documentos por especialista: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar documentos: " . $e->getMessage());
        }
        break;
    case 'get_client_document_details':
        try {
            if (empty($input['client_name'])) {
                jsonResponse(false, null, "Nome do cliente é obrigatório");
            }

            $clientName = sanitizeInput($input['client_name']);

            $stmt = $pdo->prepare("
                SELECT
                    id,
                    proposal_id,
                    client_name,
                    document_type,
                    file_path,
                    file_name,
                    file_extension,
                    file_size,
                    ROUND(file_size / 1024, 2) as file_size_kb,
                    uploaded_at
                FROM proposal_documents
                WHERE client_name = ?
                ORDER BY uploaded_at DESC
            ");
            $stmt->execute([$clientName]);
            $documents = $stmt->fetchAll();

            if (empty($documents)) {
                jsonResponse(false, null, "Nenhum documento encontrado para este cliente");
            }

            jsonResponse(true, [
                'client_name' => $clientName,
                'documents' => $documents
            ]);

        } catch (PDOException $e) {
            logError("Erro ao buscar documentos do cliente: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar documentos");
        }
        break;

    // CASO CORRIGIDO: Download de documento
   case 'download_document':
        try {
            if (empty($input['id'])) {
                jsonResponse(false, null, "ID do documento é obrigatório");
            }

            $documentId = (int)$input['id'];

            $stmt = $pdo->prepare("
                SELECT file_path, file_name, file_extension
                FROM proposal_documents
                WHERE id = ?
            ");
            $stmt->execute([$documentId]);
            $document = $stmt->fetch();

            if (!$document) {
                logError("Documento ID $documentId não encontrado no banco de dados");
                jsonResponse(false, null, "Documento não encontrado no banco de dados");
            }

            // CORREÇÃO: Lista de caminhos possíveis para procurar o arquivo
            $possiblePaths = [
                // Caminho 1: Subir um nível do diretório 'administradores' para 'public_html'
                __DIR__ . '/../uploads-images-propostas/' . basename($document['file_path']),
                
                // Caminho 2: Usar DOCUMENT_ROOT como base
                $_SERVER['DOCUMENT_ROOT'] . '/uploads-images-propostas/' . basename($document['file_path']),
                
                // Caminho 3: Caminho completo salvo no banco (se já estiver completo)
                $document['file_path'],
                
                // Caminho 4: Relativo ao document root
                $_SERVER['DOCUMENT_ROOT'] . '/' . ltrim($document['file_path'], '/'),
                
                // Caminho 5: No mesmo nível que 'administradores'
                dirname(__DIR__) . '/uploads-images-propostas/' . basename($document['file_path'])
            ];

            $filePath = null;
            $foundPath = null;

            // Tentar cada caminho possível
            foreach ($possiblePaths as $path) {
                logError("Testando caminho: " . $path);
                if (file_exists($path)) {
                    $filePath = $path;
                    $foundPath = $path;
                    logError("Arquivo encontrado em: " . $path);
                    break;
                }
            }

            if (!$filePath || !file_exists($filePath)) {
                logError("Arquivo não encontrado em nenhum dos caminhos testados");
                logError("Caminho salvo no banco: " . $document['file_path']);
                logError("__DIR__: " . __DIR__);
                logError("DOCUMENT_ROOT: " . $_SERVER['DOCUMENT_ROOT']);
                jsonResponse(false, null, "Arquivo não encontrado no servidor. Caminho esperado: " . $document['file_path']);
            }

            // Definir headers para download
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . $document['file_name'] . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: must-revalidate');
            header('Pragma: public');

            // Enviar arquivo
            readfile($filePath);
            exit;

        } catch (Exception $e) {
            logError("Erro ao baixar documento: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao baixar documento: " . $e->getMessage());
        }
        break;

    case 'get_clients_list':
        try {
            // Garante que a tabela 'contatos' exista antes de tentar buscar estatísticas
            ensureContatosTable($pdo);

            
            // Buscar clientes únicos com suas informações
            $stmt = $pdo->prepare("
                SELECT 
                    client_name,
                    client_document as cpf,
                    client_phone as telefone,
                    client_email as email,
                    COUNT(*) as total_propostas,
                    MAX(created_at) as ultima_proposta
                FROM proposals
                WHERE client_name IS NOT NULL AND client_name != ''
                GROUP BY client_name, client_document, client_phone, client_email
                ORDER BY client_name ASC
            ");
            $stmt->execute();
            $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse(true, ['clients' => $clients]);
        } catch (Exception $e) {
            logError("Erro ao buscar clientes: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao buscar clientes: ' . $e->getMessage());
        }
        break;

    case 'get_client_details':
        $clientName = isset($input['client_name']) ? sanitizeInput($input['client_name']) : '';
        
        if (empty($clientName)) {
            jsonResponse(false, null, 'Nome do cliente não fornecido');
        }
        
        try {
            // Buscar informações do cliente
            $stmt = $pdo->prepare("
                SELECT 
                    client_name,
                    client_document as cpf,
                    client_phone as telefone,
                    client_email as email,
                    client_birth_date as data_nascimento,
                    client_profession as profissao,
                    client_income as renda,
                    client_cep as cep,
                    client_address as endereco,
                    COUNT(*) as total_propostas
                FROM proposals
                WHERE client_name = :client_name
                GROUP BY client_name, client_document, client_phone, client_email,
                         client_birth_date, client_profession, client_income, client_cep, client_address
                LIMIT 1
            ");
            $stmt->execute(['client_name' => $clientName]);
            $clientInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$clientInfo) {
                jsonResponse(false, null, 'Cliente não encontrado');
            }
            
            // Buscar histórico de propostas do cliente
            $stmtProposals = $pdo->prepare("
                SELECT 
                    id,
                    client_name,
                    specialist,
                    finance_value as valor,
                    status,
                    vehicle_type as tipo_veiculo,
                    vehicle_brand as marca_veiculo,
                    vehicle_model as modelo_veiculo,
                    vehicle_year_manufacture as ano_fabricacao,
                    vehicle_year_model as ano_modelo,
                    bank_name as banco,
                    created_at,
                    observation
                FROM proposals
                WHERE client_name = :client_name
                ORDER BY created_at DESC
            ");
            $stmtProposals->execute(['client_name' => $clientName]);
            $proposals = $stmtProposals->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(true, [
                'client' => $clientInfo,
                'proposals' => $proposals
            ]);
        } catch (Exception $e) {
            logError("Erro ao buscar detalhes do cliente: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao buscar detalhes do cliente: ' . $e->getMessage());
        }
        break;

    case 'delete_client':
        $clientName = isset($input['client_name']) ? sanitizeInput($input['client_name']) : '';
        
        if (empty($clientName)) {
            jsonResponse(false, null, 'Nome do cliente não fornecido');
        }
        
        try {
            // 1. Deletar propostas associadas ao cliente
            $stmtProposals = $pdo->prepare("DELETE FROM proposals WHERE client_name = :client_name");
            $stmtProposals->execute(['client_name' => $clientName]);
            
            // 2. Deletar documentos associados ao cliente (opcional, dependendo da lógica de documentos)
            // Se a tabela proposal_documents existir e tiver a coluna client_name
            $stmtDocuments = $pdo->prepare("DELETE FROM proposal_documents WHERE client_name = :client_name");
            $stmtDocuments->execute(['client_name' => $clientName]);
            
            jsonResponse(true, ['message' => 'Cliente e dados associados deletados com sucesso.']);
        } catch (Exception $e) {
            logError("Erro ao deletar cliente: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao deletar cliente: ' . $e->getMessage());
        }
        break;

    case 'get_clients_contatos_stats':
        try {
            // Garante que a tabela 'contatos' exista antes de tentar buscar estatísticas
            ensureContatosTable($pdo);

            
            // Total de clientes (baseado em propostas únicas)
            $stmtClientes = $pdo->query("SELECT COUNT(DISTINCT client_name) FROM proposals WHERE client_name IS NOT NULL AND client_name != ''");
            $totalClientes = (int)$stmtClientes->fetchColumn();
            
            // Clientes ativos (exemplo: clientes com propostas nos últimos 6 meses)
            $stmtClientesAtivos = $pdo->query("
                SELECT COUNT(DISTINCT client_name) 
                FROM proposals 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                AND client_name IS NOT NULL AND client_name != ''
            ");
            $clientesAtivos = (int)$stmtClientesAtivos->fetchColumn();
            
            // Total de contatos (baseado na tabela 'contatos')
            $stmtContatos = $pdo->query("SELECT COUNT(*) FROM contatos");
            $totalContatos = (int)$stmtContatos->fetchColumn();
            
            jsonResponse(true, [
                'total_clientes' => $totalClientes,
                'clientes_ativos' => $clientesAtivos,
                'total_contatos' => $totalContatos
            ]);
        } catch (Exception $e) {
            logError("Erro ao buscar estatísticas: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao buscar estatísticas: ' . $e->getMessage());
        }
        break;

    case 'get_contatos_list':
        try {
            // Garante que a tabela 'contatos' exista
            ensureContatosTable($pdo);

            
            $stmt = $pdo->query("SELECT * FROM contatos ORDER BY nome_fantasia ASC");
            $contatos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            jsonResponse(true, ['contatos' => $contatos]);
        } catch (Exception $e) {
            logError("Erro ao buscar contatos: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao buscar contatos: ' . $e->getMessage());
        }
        break;

    case 'get_contato_details':
        $contatoId = isset($input['contato_id']) ? (int)$input['contato_id'] : 0;
        
        if ($contatoId <= 0) {
            jsonResponse(false, null, 'ID do contato não fornecido');
        }
        
        try {
            // Garante que a tabela 'contatos' exista
            ensureContatosTable($pdo);

            
            $stmt = $pdo->prepare("SELECT * FROM contatos WHERE id = :id");
            $stmt->execute(['id' => $contatoId]);
            $contato = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($contato) {
                jsonResponse(true, ['contato' => $contato]);
            } else {
                jsonResponse(false, null, 'Contato não encontrado');
            }
        } catch (Exception $e) {
            logError("Erro ao buscar detalhes do contato: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao buscar detalhes do contato: ' . $e->getMessage());
        }
        break;

            case 'create_contato':
            case 'update_contato':
                $id = isset($input['contato_id']) ? (int)$input['contato_id'] : 0;
        $nome = isset($input['nome']) ? sanitizeInput($input['nome']) : '';
        $nomeFantasia = isset($input['nome_fantasia']) ? sanitizeInput($input['nome_fantasia']) : '';
        $local = isset($input['local']) ? sanitizeInput($input['local']) : '';
        $telefone = isset($input['telefone']) ? sanitizeInput($input['telefone']) : '';
        $nomeLoja = isset($input['nome_loja']) ? sanitizeInput($input['nome_loja']) : '';
        $cnpj = isset($input['cnpj']) ? sanitizeInput($input['cnpj']) : '';
        
        if (empty($nome) || empty($nomeFantasia)) {
            jsonResponse(false, null, 'Nome e Nome Fantasia são obrigatórios');
        }
        
        try {
            // Garante que a tabela 'contatos' exista
            ensureContatosTable($pdo);

            
                    if ($action === 'update_contato') {
                        // Atualizar
                $stmt = $pdo->prepare("
                    UPDATE contatos SET
                        nome = :nome,
                        nome_fantasia = :nome_fantasia,
                        local = :local,
                        telefone = :telefone,
                        nome_loja = :nome_loja,
                        cnpj = :cnpj
                    WHERE id = :id
                ");
                $stmt->execute([
                    'id' => $id,
                    'nome' => $nome,
                    'nome_fantasia' => $nomeFantasia,
                    'local' => $local,
                    'telefone' => $telefone,
                    'nome_loja' => $nomeLoja,
                    'cnpj' => $cnpj
                ]);
                jsonResponse(true, ['message' => 'Contato atualizado com sucesso!', 'id' => $id]);
                    } else if ($action === 'create_contato') {
                        // Criar
                $stmt = $pdo->prepare("
                    INSERT INTO contatos (nome, nome_fantasia, local, telefone, nome_loja, cnpj)
                    VALUES (:nome, :nome_fantasia, :local, :telefone, :nome_loja, :cnpj)
                ");
                $stmt->execute([
                    'nome' => $nome,
                    'nome_fantasia' => $nomeFantasia,
                    'local' => $local,
                    'telefone' => $telefone,
                    'nome_loja' => $nomeLoja,
                    'cnpj' => $cnpj
                ]);
                $newId = $pdo->lastInsertId();
                jsonResponse(true, ['message' => 'Contato criado com sucesso!', 'id' => $newId]);
            }
        } catch (Exception $e) {
            logError("Erro ao salvar contato: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao salvar contato: ' . $e->getMessage());
        }
        break;

    case 'delete_contato':
        $contatoId = isset($input['contato_id']) ? (int)$input['contato_id'] : 0;
        
        if ($contatoId <= 0) {
            jsonResponse(false, null, 'ID do contato não fornecido');
        }
        
        try {
            // Garante que a tabela 'contatos' exista
            ensureContatosTable($pdo);

            
            $stmt = $pdo->prepare("DELETE FROM contatos WHERE id = :id");
            $stmt->execute(['id' => $contatoId]);
            
            jsonResponse(true, ['message' => 'Contato deletado com sucesso!']);
        } catch (Exception $e) {
            logError("Erro ao deletar contato: " . $e->getMessage());
            jsonResponse(false, null, 'Erro ao deletar contato: ' . $e->getMessage());
        }
        break;



// ==================== MÓDULO DE NOTAS FISCAIS - NOVOS CASOS ====================

case 'get_notas_fiscais_stats':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM notas_fiscais");
        $totalNotas = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM notas_fiscais 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $notasRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtXml = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'xml'");
        $notasXml = (int)$stmtXml->fetchColumn();
        
        $stmtPdf = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'pdf'");
        $notasPdf = (int)$stmtPdf->fetchColumn();
        
        jsonResponse(true, [
            'total_notas' => $totalNotas,
            'notas_recentes' => $notasRecentes,
            'notas_xml' => $notasXml,
            'notas_pdf' => $notasPdf
        ]);
    } catch (Exception $e) {
        logError("Erro ao buscar estatísticas de notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar estatísticas de notas fiscais: ' . $e->getMessage());
    }
    break;

case 'list_notas_fiscais':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                data,
                email,
                cpf,
                local,
                arquivo_nome,
                arquivo_tamanho,
                arquivo_tipo,
                created_at
            FROM notas_fiscais
            ORDER BY created_at DESC
        ");
        $notasFiscais = $stmt->fetchAll();
        
        jsonResponse(true, ['notas_fiscais' => $notasFiscais]);
    } catch (Exception $e) {
        logError("Erro ao listar notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao listar notas fiscais: ' . $e->getMessage());
    }
    break;

case 'upload_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        if (empty($_POST['local'])) {
            jsonResponse(false, null, "O campo Local é obrigatório");
        }
        
        $nomeCliente = isset($_POST['nome_cliente']) ? sanitizeInput($_POST['nome_cliente']) : null;
        $telefone = isset($_POST['telefone']) ? sanitizeInput($_POST['telefone']) : null;
        $data = isset($_POST['data']) ? sanitizeInput($_POST['data']) : null;
        $email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : null;
        $cpf = isset($_POST['cpf']) ? sanitizeInput($_POST['cpf']) : null;
        $local = sanitizeInput($_POST['local']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_PARTIAL:
                        $errorMsg = "O upload do arquivo foi parcial";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg = "Erro desconhecido no upload: " . $_FILES['arquivo']['error'];
                        break;
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = basename($file['name']);
        $fileTmpName = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if ($fileSize > 50 * 1024 * 1024) { // 50MB
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        if ($fileExt !== 'pdf' && $fileExt !== 'xml') {
            jsonResponse(false, null, "Apenas arquivos PDF e XML são permitidos");
        }
        
        $uploadDir = 'uploads/notas_fiscais/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $newFileName = uniqid('nf_', true) . '.' . $fileExt;
        $fileDest = $uploadDir . $newFileName;
        
        if (move_uploaded_file($fileTmpName, $fileDest)) {
            $stmt = $pdo->prepare("
                INSERT INTO notas_fiscais 
                (nome_cliente, telefone, data, email, cpf, local, arquivo_path, arquivo_nome, arquivo_tamanho, arquivo_tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $nomeCliente, 
                $telefone, 
                $data, 
                $email, 
                $cpf, 
                $local, 
                $fileDest, 
                $fileName, 
                $fileSize, 
                $fileExt
            ]);
            
            jsonResponse(true, ['message' => 'Nota Fiscal enviada com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao mover o arquivo para o destino");
        }
    } catch (Exception $e) {
        logError("Erro no upload de nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro no upload de nota fiscal: ' . $e->getMessage());
    }
    break;

case 'get_nota_fiscal_details':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT * FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            jsonResponse(true, ['nota_fiscal' => $notaFiscal]);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao buscar detalhes da nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar detalhes da nota fiscal: ' . $e->getMessage());
    }
    break;

case 'download_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT arquivo_path, arquivo_nome FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            $filePath = $notaFiscal['arquivo_path'];
            $fileName = $notaFiscal['arquivo_nome'];
            
            if (file_exists($filePath)) {
                header('Content-Description: File Transfer');
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . $fileName . '"');
                header('Expires: 0');
                header('Cache-Control: must-revalidate');
                header('Pragma: public');
                header('Content-Length: ' . filesize($filePath));
                ob_clean();
                flush();
                readfile($filePath);
                exit;
            } else {
                jsonResponse(false, null, "Arquivo não encontrado no servidor");
            }
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao baixar nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao baixar nota fiscal: ' . $e->getMessage());
    }
    break;

case 'delete_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
          // ✅ CORRIGIDO: Aceitar tanto 'id' quanto 'nota_fiscal_id'
        $notaFiscalId = isset($input['id']) ? (int)$input['id'] : 
                        (isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0);
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        // 1. Obter o caminho do arquivo para exclusão
        $stmt = $pdo->prepare("SELECT arquivo_path FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            // 2. Excluir o registro do banco de dados
            $stmtDelete = $pdo->prepare("DELETE FROM notas_fiscais WHERE id = ?");
            $stmtDelete->execute([$notaFiscalId]);
            
            // 3. Excluir o arquivo físico
            $filePath = $notaFiscal['arquivo_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            jsonResponse(true, ['message' => 'Nota Fiscal excluída com sucesso!']);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao excluir nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao excluir nota fiscal: ' . $e->getMessage());
    }
    break;

// ==================== MÓDULO DE CONTRATOS - NOVOS CASOS ====================

case 'get_contratos_stats':
    try {
        
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM contratos_upload");
        $totalContratos = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM contratos_upload 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $contratosRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtClientes = $pdo->query("SELECT COUNT(DISTINCT nome_cliente) FROM contratos_upload");
        $clientesUnicos = (int)$stmtClientes->fetchColumn();
        
        jsonResponse(true, [
            'total_contratos' => $totalContratos,
            'contratos_recentes' => $contratosRecentes,
            'clientes_unicos' => $clientesUnicos
        ]);
    } catch (PDOException $e) {
        logError("Erro ao buscar estatísticas de contratos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar estatísticas");
    }
    break;

case 'list_contratos':
    try {
        
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at
            FROM contratos_upload
            ORDER BY created_at DESC
        ");
        $contratos = $stmt->fetchAll();
        
        jsonResponse(true, ['contratos' => $contratos]);
    } catch (PDOException $e) {
        logError("Erro ao listar contratos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar contratos");
    }
    break;

case 'upload_contrato':
    try {
        
        
        if (empty($_POST['nome_cliente']) || empty($_POST['telefone'])) {
            jsonResponse(false, null, "Nome do cliente e telefone são obrigatórios");
        }
        
        $nomeCliente = sanitizeInput($_POST['nome_cliente']);
        $telefone = sanitizeInput($_POST['telefone']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    

default:
                        $errorMsg .= " (código de erro: " . $_FILES['arquivo']['error'] . ")";
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = $file['name'];
        $fileTmp = $file['tmp_name'];
        $fileSize = $file['size'];
        
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            jsonResponse(false, null, "Apenas arquivos PDF são permitidos");
        }
        
        if ($fileSize > 50 * 1024 * 1024) {
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        $uploadDir = __DIR__ . '/uploads/contratos/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                jsonResponse(false, null, "Erro ao criar diretório de upload");
            }
        }
        
        $nomeArquivo = uniqid() . '_' . time() . '.pdf';
        $caminhoCompleto = $uploadDir . $nomeArquivo;
        
        if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
            jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
        }
        
        $caminhoRelativo = 'uploads/contratos/' . $nomeArquivo;
        
        $stmt = $pdo->prepare("
            INSERT INTO contratos_upload (nome_cliente, telefone, arquivo_path, arquivo_nome, arquivo_tamanho, specialist_key)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([$nomeCliente, $telefone, $caminhoRelativo, $fileName, $fileSize, $specialistKey]);
        
        if ($result) {
            $contratoId = $pdo->lastInsertId();
            logError("Contrato adicionado: ID $contratoId - Cliente: $nomeCliente");
            jsonResponse(true, [
                'message' => 'Contrato adicionado com sucesso!',
                'id' => $contratoId
            ]);
        } else {
            if (file_exists($caminhoCompleto)) {
                unlink($caminhoCompleto);
            }
            jsonResponse(false, null, "Erro ao salvar contrato no banco de dados");
        }
        
    } catch (Exception $e) {
        logError("Erro ao fazer upload de contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar contrato: " . $e->getMessage());
    }
    break;

case 'get_contrato_details':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_path,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at,
                updated_at
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if ($contrato) {
            jsonResponse(true, ['contrato' => $contrato]);
        } else {
            jsonResponse(false, null, "Contrato não encontrado");
        }
    } catch (PDOException $e) {
        logError("Erro ao buscar detalhes do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar detalhes do contrato");
    }
    break;

case 'download_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT arquivo_path, arquivo_nome
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        
        if (!file_exists($caminhoArquivo)) {
            logError("Arquivo não encontrado: " . $caminhoArquivo);
            jsonResponse(false, null, "Arquivo não encontrado no servidor");
        }
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $contrato['arquivo_nome'] . '"');
        header('Content-Length: ' . filesize($caminhoArquivo));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($caminhoArquivo);
        exit;
        
    } catch (Exception $e) {
        logError("Erro ao fazer download do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao fazer download do contrato");
    }
    break;

case 'delete_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT arquivo_path FROM contratos_upload WHERE id = ?");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        if (file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        
        $stmt = $pdo->prepare("DELETE FROM contratos_upload WHERE id = ?");
        $result = $stmt->execute([$contratoId]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Contrato #$contratoId deletado");
            jsonResponse(true, ['message' => 'Contrato deletado com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao deletar contrato");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao deletar contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao deletar contrato");
        }
    break;



// ==================== MÓDULO DE NOTAS FISCAIS - NOVOS CASOS ====================

case 'get_notas_fiscais_stats':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM notas_fiscais");
        $totalNotas = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM notas_fiscais 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $notasRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtXml = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'xml'");
        $notasXml = (int)$stmtXml->fetchColumn();
        
        $stmtPdf = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'pdf'");
        $notasPdf = (int)$stmtPdf->fetchColumn();
        
        jsonResponse(true, [
            'total_notas' => $totalNotas,
            'notas_recentes' => $notasRecentes,
            'notas_xml' => $notasXml,
            'notas_pdf' => $notasPdf
        ]);
    } catch (Exception $e) {
        logError("Erro ao buscar estatísticas de notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar estatísticas de notas fiscais: ' . $e->getMessage());
    }
    break;

case 'list_notas_fiscais':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                data,
                email,
                cpf,
                local,
                arquivo_nome,
                arquivo_tamanho,
                arquivo_tipo,
                created_at
            FROM notas_fiscais
            ORDER BY created_at DESC
        ");
        $notasFiscais = $stmt->fetchAll();
        
        jsonResponse(true, ['notas_fiscais' => $notasFiscais]);
    } catch (Exception $e) {
        logError("Erro ao listar notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao listar notas fiscais: ' . $e->getMessage());
    }
    break;

case 'upload_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        if (empty($_POST['local'])) {
            jsonResponse(false, null, "O campo Local é obrigatório");
        }
        
        $nomeCliente = isset($_POST['nome_cliente']) ? sanitizeInput($_POST['nome_cliente']) : null;
        $telefone = isset($_POST['telefone']) ? sanitizeInput($_POST['telefone']) : null;
        $data = isset($_POST['data']) ? sanitizeInput($_POST['data']) : null;
        $email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : null;
        $cpf = isset($_POST['cpf']) ? sanitizeInput($_POST['cpf']) : null;
        $local = sanitizeInput($_POST['local']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_PARTIAL:
                        $errorMsg = "O upload do arquivo foi parcial";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg = "Erro desconhecido no upload: " . $_FILES['arquivo']['error'];
                        break;
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = basename($file['name']);
        $fileTmpName = $file['tmp_name'];
        $fileSize = $file['size'];
        $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        
        if ($fileSize > 50 * 1024 * 1024) { // 50MB
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        if ($fileExt !== 'pdf' && $fileExt !== 'xml') {
            jsonResponse(false, null, "Apenas arquivos PDF e XML são permitidos");
        }
        
        $uploadDir = 'uploads/notas_fiscais/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $newFileName = uniqid('nf_', true) . '.' . $fileExt;
        $fileDest = $uploadDir . $newFileName;
        
        if (move_uploaded_file($fileTmpName, $fileDest)) {
            $stmt = $pdo->prepare("
                INSERT INTO notas_fiscais 
                (nome_cliente, telefone, data, email, cpf, local, arquivo_path, arquivo_nome, arquivo_tamanho, arquivo_tipo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $nomeCliente, 
                $telefone, 
                $data, 
                $email, 
                $cpf, 
                $local, 
                $fileDest, 
                $fileName, 
                $fileSize, 
                $fileExt
            ]);
            
            jsonResponse(true, ['message' => 'Nota Fiscal enviada com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao mover o arquivo para o destino");
        }
    } catch (Exception $e) {
        logError("Erro no upload de nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro no upload de nota fiscal: ' . $e->getMessage());
    }
    break;

case 'get_nota_fiscal_details':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT * FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            jsonResponse(true, ['nota_fiscal' => $notaFiscal]);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao buscar detalhes da nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao buscar detalhes da nota fiscal: ' . $e->getMessage());
    }
    break;

case 'download_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        $stmt = $pdo->prepare("SELECT arquivo_path, arquivo_nome FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            $filePath = $notaFiscal['arquivo_path'];
            $fileName = $notaFiscal['arquivo_nome'];
            
            if (file_exists($filePath)) {
                header('Content-Description: File Transfer');
                header('Content-Type: application/octet-stream');
                header('Content-Disposition: attachment; filename="' . $fileName . '"');
                header('Expires: 0');
                header('Cache-Control: must-revalidate');
                header('Pragma: public');
                header('Content-Length: ' . filesize($filePath));
                ob_clean();
                flush();
                readfile($filePath);
                exit;
            } else {
                jsonResponse(false, null, "Arquivo não encontrado no servidor");
            }
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao baixar nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao baixar nota fiscal: ' . $e->getMessage());
    }
    break;

case 'delete_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $notaFiscalId = isset($input['nota_fiscal_id']) ? (int)$input['nota_fiscal_id'] : 0;
        
        if ($notaFiscalId <= 0) {
            jsonResponse(false, null, "ID da Nota Fiscal inválido");
        }
        
        // 1. Obter o caminho do arquivo para exclusão
        $stmt = $pdo->prepare("SELECT arquivo_path FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            // 2. Excluir o registro do banco de dados
            $stmtDelete = $pdo->prepare("DELETE FROM notas_fiscais WHERE id = ?");
            $stmtDelete->execute([$notaFiscalId]);
            
            // 3. Excluir o arquivo físico
            $filePath = $notaFiscal['arquivo_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            jsonResponse(true, ['message' => 'Nota Fiscal excluída com sucesso!']);
        } else {
            jsonResponse(false, null, "Nota Fiscal não encontrada");
        }
    } catch (Exception $e) {
        logError("Erro ao excluir nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao excluir nota fiscal: ' . $e->getMessage());
    }
    break;

// ==================== MÓDULO DE CONTRATOS - NOVOS CASOS ====================

case 'get_contratos_stats':
    try {
        
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM contratos_upload");
        $totalContratos = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM contratos_upload 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $contratosRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtClientes = $pdo->query("SELECT COUNT(DISTINCT nome_cliente) FROM contratos_upload");
        $clientesUnicos = (int)$stmtClientes->fetchColumn();
        
        jsonResponse(true, [
            'total_contratos' => $totalContratos,
            'contratos_recentes' => $contratosRecentes,
            'clientes_unicos' => $clientesUnicos
        ]);
    } catch (PDOException $e) {
        logError("Erro ao buscar estatísticas de contratos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar estatísticas");
    }
    break;

case 'list_contratos':
    try {
        
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at
            FROM contratos_upload
            ORDER BY created_at DESC
        ");
        $contratos = $stmt->fetchAll();
        
        jsonResponse(true, ['contratos' => $contratos]);
    } catch (PDOException $e) {
        logError("Erro ao listar contratos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar contratos");
    }
    break;

case 'upload_contrato':
    try {
        
        
        if (empty($_POST['nome_cliente']) || empty($_POST['telefone'])) {
            jsonResponse(false, null, "Nome do cliente e telefone são obrigatórios");
        }
        
        $nomeCliente = sanitizeInput($_POST['nome_cliente']);
        $telefone = sanitizeInput($_POST['telefone']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg .= " (código de erro: " . $_FILES['arquivo']['error'] . ")";
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = $file['name'];
        $fileTmp = $file['tmp_name'];
        $fileSize = $file['size'];
        
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if ($ext !== 'pdf') {
            jsonResponse(false, null, "Apenas arquivos PDF são permitidos");
        }
        
        if ($fileSize > 50 * 1024 * 1024) {
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        $uploadDir = __DIR__ . '/uploads/contratos/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                jsonResponse(false, null, "Erro ao criar diretório de upload");
            }
        }
        
        $nomeArquivo = uniqid() . '_' . time() . '.pdf';
        $caminhoCompleto = $uploadDir . $nomeArquivo;
        
        if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
            jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
        }
        
        $caminhoRelativo = 'uploads/contratos/' . $nomeArquivo;
        
        $stmt = $pdo->prepare("
            INSERT INTO contratos_upload (nome_cliente, telefone, arquivo_path, arquivo_nome, arquivo_tamanho, specialist_key)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([$nomeCliente, $telefone, $caminhoRelativo, $fileName, $fileSize, $specialistKey]);
        
        if ($result) {
            $contratoId = $pdo->lastInsertId();
            logError("Contrato adicionado: ID $contratoId - Cliente: $nomeCliente");
            jsonResponse(true, [
                'message' => 'Contrato adicionado com sucesso!',
                'id' => $contratoId
            ]);
        } else {
            if (file_exists($caminhoCompleto)) {
                unlink($caminhoCompleto);
            }
            jsonResponse(false, null, "Erro ao salvar contrato no banco de dados");
        }
        
    } catch (Exception $e) {
        logError("Erro ao fazer upload de contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar contrato: " . $e->getMessage());
    }
    break;

case 'get_contrato_details':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nome_cliente,
                telefone,
                arquivo_path,
                arquivo_nome,
                arquivo_tamanho,
                ROUND(arquivo_tamanho / 1024, 2) as tamanho_kb,
                created_at,
                updated_at
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if ($contrato) {
            jsonResponse(true, ['contrato' => $contrato]);
        } else {
            jsonResponse(false, null, "Contrato não encontrado");
        }
    } catch (PDOException $e) {
        logError("Erro ao buscar detalhes do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar detalhes do contrato");
    }
    break;

case 'download_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT arquivo_path, arquivo_nome
            FROM contratos_upload
            WHERE id = ?
        ");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        
        if (!file_exists($caminhoArquivo)) {
            logError("Arquivo não encontrado: " . $caminhoArquivo);
            jsonResponse(false, null, "Arquivo não encontrado no servidor");
        }
        
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $contrato['arquivo_nome'] . '"');
        header('Content-Length: ' . filesize($caminhoArquivo));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($caminhoArquivo);
        exit;
        
    } catch (Exception $e) {
        logError("Erro ao fazer download do contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao fazer download do contrato");
    }
    break;

case 'delete_contrato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contrato não especificado");
        }
        
        $contratoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT arquivo_path FROM contratos_upload WHERE id = ?");
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();
        
        if (!$contrato) {
            jsonResponse(false, null, "Contrato não encontrado");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $contrato['arquivo_path'];
        if (file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        
        $stmt = $pdo->prepare("DELETE FROM contratos_upload WHERE id = ?");
        $result = $stmt->execute([$contratoId]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Contrato #$contratoId deletado");
            jsonResponse(true, ['message' => 'Contrato deletado com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao deletar contrato");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao deletar contrato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao deletar contrato");
        }
    break;

default:

// ============ CASE STATEMENTS PARA NOTAS FISCAIS ============

case 'get_notas_fiscais_stats':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmtTotal = $pdo->query("SELECT COUNT(*) FROM notas_fiscais");
        $totalNotas = (int)$stmtTotal->fetchColumn();
        
        $stmtRecentes = $pdo->query("
            SELECT COUNT(*) FROM notas_fiscais 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $notasRecentes = (int)$stmtRecentes->fetchColumn();
        
        $stmtXml = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'xml'");
        $notasXml = (int)$stmtXml->fetchColumn();
        
        $stmtPdf = $pdo->query("SELECT COUNT(*) FROM notas_fiscais WHERE arquivo_tipo = 'pdf'");
        $notasPdf = (int)$stmtPdf->fetchColumn();
        
        jsonResponse(true, [
            'total_notas' => $totalNotas,
            'notas_recentes' => $notasRecentes,
            'notas_xml' => $notasXml,
            'notas_pdf' => $notasPdf
        ]);
    } catch (PDOException $e) {
        logError("Erro ao buscar estatísticas de notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar estatísticas");
    }
    break;

case 'list_notas_fiscais':
    try {
        ensureNotasFiscaisTable($pdo);
        
        $stmt = $pdo->query("
            SELECT 
                id,
                nome_cliente,
                telefone,
                data,
                email,
                cpf,
                local,
                arquivo_nome,
                arquivo_tamanho,
                arquivo_tipo,
                created_at
            FROM notas_fiscais
            ORDER BY created_at DESC
        ");
        $notasFiscais = $stmt->fetchAll();
        
        jsonResponse(true, ['notas_fiscais' => $notasFiscais]);
    } catch (PDOException $e) {
        logError("Erro ao listar notas fiscais: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar notas fiscais");
    }
    break;

case 'upload_nota_fiscal':
    try {
        ensureNotasFiscaisTable($pdo);
        
        if (empty($_POST['local'])) {
            jsonResponse(false, null, "O campo Local é obrigatório");
        }
        
        $nomeCliente = isset($_POST['nome_cliente']) ? sanitizeInput($_POST['nome_cliente']) : null;
        $telefone = isset($_POST['telefone']) ? sanitizeInput($_POST['telefone']) : null;
        $data = isset($_POST['data']) ? sanitizeInput($_POST['data']) : null;
        $email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : null;
        $cpf = isset($_POST['cpf']) ? sanitizeInput($_POST['cpf']) : null;
        $local = sanitizeInput($_POST['local']);
        
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            $errorMsg = "Erro ao fazer upload do arquivo";
            if (isset($_FILES['arquivo']['error'])) {
                switch ($_FILES['arquivo']['error']) {
                    case UPLOAD_ERR_INI_SIZE:
                    case UPLOAD_ERR_FORM_SIZE:
                        $errorMsg = "Arquivo muito grande. Tamanho máximo: 50MB";
                        break;
                    case UPLOAD_ERR_NO_FILE:
                        $errorMsg = "Nenhum arquivo foi enviado";
                        break;
                    default:
                        $errorMsg .= " (código de erro: " . $_FILES['arquivo']['error'] . ")";
                }
            }
            jsonResponse(false, null, $errorMsg);
        }
        
        $file = $_FILES['arquivo'];
        $fileName = $file['name'];
        $fileTmp = $file['tmp_name'];
        $fileSize = $file['size'];
        
        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (!in_array($ext, ['xml', 'pdf'])) {
            jsonResponse(false, null, "Apenas arquivos XML e PDF são permitidos");
        }
        
        if ($fileSize > 50 * 1024 * 1024) {
            jsonResponse(false, null, "Arquivo muito grande. Tamanho máximo: 50MB");
        }
        
        $uploadDir = __DIR__ . '/uploads/notas_fiscais/';
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                jsonResponse(false, null, "Erro ao criar diretório de upload");
            }
        }
        
        $nomeArquivo = uniqid() . '_' . time() . '.' . $ext;
        $caminhoCompleto = $uploadDir . $nomeArquivo;
        
        if (!move_uploaded_file($fileTmp, $caminhoCompleto)) {
            jsonResponse(false, null, "Erro ao salvar arquivo no servidor");
        }
        
        $caminhoRelativo = 'uploads/notas_fiscais/' . $nomeArquivo;
        
        $stmt = $pdo->prepare("
            INSERT INTO notas_fiscais (nome_cliente, telefone, data, email, cpf, local, arquivo_path, arquivo_nome, arquivo_tamanho, arquivo_tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $result = $stmt->execute([$nomeCliente, $telefone, $data, $email, $cpf, $local, $caminhoRelativo, $fileName, $fileSize, $ext]);
        
        if ($result) {
            $notaFiscalId = $pdo->lastInsertId();
            logError("Nota fiscal adicionada: ID $notaFiscalId - Local: $local");
            jsonResponse(true, [
                'message' => 'Nota fiscal adicionada com sucesso!',
                'id' => $notaFiscalId
            ]);
        } else {
            if (file_exists($caminhoCompleto)) {
                unlink($caminhoCompleto);
            }
            jsonResponse(false, null, "Erro ao salvar nota fiscal no banco de dados");
        }
        
    } catch (Exception $e) {
        logError("Erro ao fazer upload de nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar nota fiscal: " . $e->getMessage());
    }
    break;

case 'get_nota_fiscal_details':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID da nota fiscal não especificado");
        }
        
        $notaFiscalId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                nome_cliente,
                telefone,
                data,
                email,
                cpf,
                local,
                arquivo_path,
                arquivo_nome,
                arquivo_tamanho,
                arquivo_tipo,
                created_at,
                updated_at
            FROM notas_fiscais
            WHERE id = ?
        ");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if ($notaFiscal) {
            jsonResponse(true, ['nota_fiscal' => $notaFiscal]);
        } else {
            jsonResponse(false, null, "Nota fiscal não encontrada");
        }
    } catch (PDOException $e) {
        logError("Erro ao buscar detalhes da nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar detalhes da nota fiscal");
    }
    break;

case 'download_nota_fiscal':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID da nota fiscal não especificado");
        }
        
        $notaFiscalId = (int)$input['id'];
        
        $stmt = $pdo->prepare("
            SELECT arquivo_path, arquivo_nome, arquivo_tipo
            FROM notas_fiscais
            WHERE id = ?
        ");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if (!$notaFiscal) {
            jsonResponse(false, null, "Nota fiscal não encontrada");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $notaFiscal['arquivo_path'];
        
        if (!file_exists($caminhoArquivo)) {
            logError("Arquivo não encontrado: " . $caminhoArquivo);
            jsonResponse(false, null, "Arquivo não encontrado no servidor");
        }
        
        $contentType = $notaFiscal['arquivo_tipo'] === 'xml' ? 'application/xml' : 'application/pdf';
        
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: attachment; filename="' . $notaFiscal['arquivo_nome'] . '"');
        header('Content-Length: ' . filesize($caminhoArquivo));
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        readfile($caminhoArquivo);
        exit;
        
    } catch (Exception $e) {
        logError("Erro ao fazer download da nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao fazer download da nota fiscal");
    }
    break;

case 'delete_nota_fiscal':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID da nota fiscal não especificado");
        }
        
        $notaFiscalId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT arquivo_path FROM notas_fiscais WHERE id = ?");
        $stmt->execute([$notaFiscalId]);
        $notaFiscal = $stmt->fetch();
        
        if (!$notaFiscal) {
            jsonResponse(false, null, "Nota fiscal não encontrada");
        }
        
        $caminhoArquivo = __DIR__ . '/' . $notaFiscal['arquivo_path'];
        if (file_exists($caminhoArquivo)) {
            unlink($caminhoArquivo);
        }
        
        $stmt = $pdo->prepare("DELETE FROM notas_fiscais WHERE id = ?");
        $result = $stmt->execute([$notaFiscalId]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Nota fiscal #$notaFiscalId deletada");
            jsonResponse(true, ['message' => 'Nota fiscal deletada com sucesso!']);
        } else {
            jsonResponse(false, null, "Erro ao deletar nota fiscal");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao deletar nota fiscal: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao deletar nota fiscal");
    }
    break;

// ============ FIM DOS CASE STATEMENTS PARA NOTAS FISCAIS ============

// ============ NOVOS ENDPOINTS PARA CONTATOS E CLIENTES ============

// Listar todos os contatos
case 'list_contatos':
    try {
        $searchTerm = $input['search'] ?? '';
        
        $query = "
            SELECT 
                id,
                nome,
                nome_fantasia,
                data_inicio_parceria,
                local,
                telefone,
                nome_loja,
                cnpj,
                created_at
            FROM contatos
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($searchTerm) {
            $query .= " AND (nome_fantasia LIKE ? OR nome LIKE ? OR cnpj LIKE ?)";
            $searchParam = '%' . $searchTerm . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " ORDER BY nome_fantasia ASC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $contatos = $stmt->fetchAll();
        
        jsonResponse(true, [
            'contatos' => $contatos,
            'total' => count($contatos)
        ]);
        
    } catch (PDOException $e) {
        logError("Erro ao listar contatos: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar contatos");
    }
    break;

// Criar novo contato
case 'create_contato':
    try {
        ensureContatosTable($pdo);
        
        $requiredFields = ['nome', 'nome_fantasia'];
        foreach ($requiredFields as $field) {
            if (empty($input[$field])) {
                jsonResponse(false, null, "Campo obrigatório: $field");
            }
        }
        
        $nome = sanitizeInput($input['nome']);
        $nomeFantasia = sanitizeInput($input['nome_fantasia']);
        $dataInicioParceria = isset($input['data_inicio_parceria']) ? sanitizeInput($input['data_inicio_parceria']) : null;
        $local = isset($input['local']) ? sanitizeInput($input['local']) : null;
        $telefone = isset($input['telefone']) ? sanitizeInput($input['telefone']) : null;
        $nomeLoja = isset($input['nome_loja']) ? sanitizeInput($input['nome_loja']) : null;
        $cnpj = isset($input['cnpj']) ? sanitizeInput($input['cnpj']) : null;
        
        $stmt = $pdo->prepare("
            INSERT INTO contatos (nome, nome_fantasia, data_inicio_parceria, local, telefone, nome_loja, cnpj)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $nome,
            $nomeFantasia,
            $dataInicioParceria,
            $local,
            $telefone,
            $nomeLoja,
            $cnpj
        ]);
        
        if ($result) {
            $contatoId = $pdo->lastInsertId();
            logError("Contato criado: ID $contatoId, Nome Fantasia: $nomeFantasia");
            
            jsonResponse(true, [
                'message' => 'Contato criado com sucesso!',
                'contato_id' => $contatoId
            ]);
        } else {
            jsonResponse(false, null, "Erro ao criar contato");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao criar contato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao criar contato");
    }
    break;

// Atualizar contato
case 'update_contato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contato não especificado");
        }
        
        $contatoId = (int)$input['id'];
        
        $nome = sanitizeInput($input['nome']);
        $nomeFantasia = sanitizeInput($input['nome_fantasia']);
        $dataInicioParceria = isset($input['data_inicio_parceria']) ? sanitizeInput($input['data_inicio_parceria']) : null;
        $local = isset($input['local']) ? sanitizeInput($input['local']) : null;
        $telefone = isset($input['telefone']) ? sanitizeInput($input['telefone']) : null;
        $nomeLoja = isset($input['nome_loja']) ? sanitizeInput($input['nome_loja']) : null;
        $cnpj = isset($input['cnpj']) ? sanitizeInput($input['cnpj']) : null;
        
        $stmt = $pdo->prepare("
            UPDATE contatos
            SET nome = ?, nome_fantasia = ?, data_inicio_parceria = ?, local = ?, telefone = ?, nome_loja = ?, cnpj = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $result = $stmt->execute([
            $nome,
            $nomeFantasia,
            $dataInicioParceria,
            $local,
            $telefone,
            $nomeLoja,
            $cnpj,
            $contatoId
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Contato #$contatoId atualizado");
            jsonResponse(true, ['message' => 'Contato atualizado com sucesso!']);
        } else {
            jsonResponse(true, ['message' => 'Contato atualizado com sucesso!']);
        }
        
    } catch (PDOException $e) {
        logError("Erro ao atualizar contato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao atualizar contato");
    }
    break;

// Deletar contato
case 'delete_contato':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contato não especificado");
        }
        
        $contatoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("DELETE FROM contatos WHERE id = ?");
        $result = $stmt->execute([$contatoId]);
        
        if ($result && $stmt->rowCount() > 0) {
            logError("Contato #$contatoId deletado");
            jsonResponse(true, ['message' => 'Contato deletado com sucesso!']);
        } else {
            jsonResponse(false, null, "Contato não encontrado");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao deletar contato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao deletar contato");
    }
    break;

// Obter detalhes de um contato
case 'get_contato_details':
    try {
        if (empty($input['id'])) {
            jsonResponse(false, null, "ID do contato não especificado");
        }
        
        $contatoId = (int)$input['id'];
        
        $stmt = $pdo->prepare("SELECT * FROM contatos WHERE id = ?");
        $stmt->execute([$contatoId]);
        $contato = $stmt->fetch();
        
        if ($contato) {
            jsonResponse(true, ['contato' => $contato]);
        } else {
            jsonResponse(false, null, "Contato não encontrado");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao buscar detalhes do contato: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar detalhes do contato");
    }
    break;

// Listar clientes por especialista (da tabela proposals)
case 'list_clientes_by_specialist':
    try {
        $specialist = $input['specialist'] ?? '';
        $searchTerm = $input['search'] ?? '';
        
        $query = "
            SELECT 
                client_name,
                client_document,
                client_email,
                client_phone,
                COUNT(*) as total_propostas,
                MAX(created_at) as ultima_proposta,
                GROUP_CONCAT(DISTINCT status) as status_list
            FROM proposals
            WHERE specialist = ?
        ";
        
        $params = [$specialist];
        
        if ($searchTerm) {
            $query .= " AND (client_name LIKE ? OR client_document LIKE ?)";
            $searchParam = '%' . $searchTerm . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $query .= " GROUP BY client_name, client_document, client_email, client_phone ORDER BY ultima_proposta DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $clientes = $stmt->fetchAll();
        
        // Calcular clientes ativos (com propostas nos últimos 6 meses)
        $sixMonthsAgo = date('Y-m-d H:i:s', strtotime('-6 months'));
        $clientesAtivos = 0;
        foreach ($clientes as $cliente) {
            if ($cliente['ultima_proposta'] >= $sixMonthsAgo) {
                $clientesAtivos++;
            }
        }
        
        jsonResponse(true, [
            'clientes' => $clientes,
            'total' => count($clientes),
            'ativos' => $clientesAtivos
        ]);
        
    } catch (PDOException $e) {
        logError("Erro ao listar clientes: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao listar clientes");
    }
    break;

// Obter histórico completo de propostas de um cliente
    case 'get_client_history':
    try {
        $clientDocument = sanitizeInput($_GET['document'] ?? '');
        
        if (empty($clientDocument)) {
            jsonResponse(false, null, "Documento do cliente não informado");
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                id,
                client_name,
                client_document,
                client_email,
                client_phone,
                vehicle_brand,
                vehicle_model,
                vehicle_year_manufacture,
                vehicle_year_model,
                finance_value,
                status,
                bank_name,
                specialist,
                created_at,
                updated_at
            FROM proposals
            WHERE client_document = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$clientDocument]);
        $propostas = $stmt->fetchAll();
        
        if ($propostas) {
            $clientInfo = [
                'nome' => $propostas[0]['client_name'],
                'documento' => $propostas[0]['client_document'],
                'email' => $propostas[0]['client_email'],
                'telefone' => $propostas[0]['client_phone'],
                'total_propostas' => count($propostas)
            ];
            
            jsonResponse(true, [
                'client' => $clientInfo,
                'propostas' => $propostas
            ]);
        } else {
            jsonResponse(false, null, "Cliente não encontrado");
        }
        
    } catch (PDOException $e) {
        logError("Erro ao buscar histórico do cliente: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao buscar histórico do cliente");
    }
    break;

    case 'send_support_message':
        try {
            $senderId = (int)($input['sender_id'] ?? 0);
            $senderName = sanitizeInput($input['sender_name'] ?? '');
            $senderType = sanitizeInput($input['sender_type'] ?? '');
            $message = sanitizeInput($input['message'] ?? '');
            
            if (empty($message) || empty($senderName) || empty($senderType)) {
                jsonResponse(false, null, "Dados incompletos: mensagem, nome e tipo são obrigatórios");
                break;
            }

            // Criar a tabela se não existir
            $createTableSQL = "
                CREATE TABLE IF NOT EXISTS support_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    sender_name VARCHAR(255) NOT NULL,
                    sender_type VARCHAR(50) NOT NULL,
                    message LONGTEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $pdo->exec($createTableSQL);

            $stmt = $pdo->prepare("INSERT INTO support_messages (sender_id, sender_name, sender_type, message, created_at) VALUES (?, ?, ?, ?, NOW())");
            $result = $stmt->execute([$senderId, $senderName, $senderType, $message]);
            
            if ($result) {
                $messageId = $pdo->lastInsertId();
                jsonResponse(true, [
                    'id' => $messageId,
                    'success' => true,
                    'message' => 'Mensagem enviada com sucesso'
                ]);
            } else {
                jsonResponse(false, null, "Falha ao inserir mensagem no banco de dados");
            }
        } catch (PDOException $e) {
            logError("Erro ao enviar mensagem de suporte: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao enviar mensagem: " . $e->getMessage());
        } catch (Exception $e) {
            logError("Erro geral ao enviar mensagem de suporte: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao enviar mensagem: " . $e->getMessage());
        }
        break;

    case 'get_support_messages':
        try {
            // Criar a tabela se não existir
            $createTableSQL = "
                CREATE TABLE IF NOT EXISTS support_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    sender_name VARCHAR(255) NOT NULL,
                    sender_type VARCHAR(50) NOT NULL,
                    message LONGTEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $pdo->exec($createTableSQL);
            
            $stmt = $pdo->query("SELECT * FROM support_messages ORDER BY created_at ASC LIMIT 500");
            $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonResponse(true, $messages);
        } catch (PDOException $e) {
            logError("Erro ao buscar mensagens de suporte: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar mensagens");
        } catch (Exception $e) {
            logError("Erro geral ao buscar mensagens de suporte: " . $e->getMessage());
            jsonResponse(false, null, "Erro ao buscar mensagens");
        }
        break;

// ============ NOVA AÇÃO: GERAR RELATÓRIO EM PDF OU EXCEL ============
case 'generate_report':
    try {
        $year = isset($input['year']) ? trim($input['year']) : '';
        $month = isset($input['month']) ? trim($input['month']) : '';
        $specialist = isset($input['specialist']) ? trim($input['specialist']) : '';
        $format = isset($input['format']) ? strtolower(trim($input['format'])) : 'pdf';
        
        // Validar formato
        if (!in_array($format, ['pdf', 'excel'])) {
            jsonResponse(false, null, "Formato inválido. Use 'pdf' ou 'excel'");
        }
        
        // Construir query para buscar propostas
        $query = "SELECT id, client_name, client_document, client_cpf, client_cnpj, specialist, finance_value, status, bank_name, created_at, vehicle_year_manufacture, vehicle_year_model FROM proposals WHERE 1=1";
        $params = [];
        
        if (!empty($year)) {
            $query .= " AND YEAR(created_at) = ?";
            $params[] = (int)$year;
        }
        
        if (!empty($month)) {
            $query .= " AND MONTH(created_at) = ?";
            $params[] = (int)$month;
        }
        
        if (!empty($specialist)) {
            $query .= " AND specialist = ?";
            $params[] = $specialist;
        }


        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $proposals = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // --- Estatísticas Financeiras ---
        $stats = [
            'total_value' => 0,
            'formalized_value' => 0,
            'total_count' => count($proposals),
            'formalized_count' => 0,
            'by_specialist' => [],
            'by_status' => []
        ];

        foreach ($proposals as $prop) {
            $val = (float)($prop["finance_value"] ?? 0);
            $spec = $prop["specialist"];
            $status = $prop["status"] ?? 'pending';

            // Se o especialista não for definido ou for vazio, pular esta proposta para as estatísticas de especialista
            if (empty($spec)) continue;
            // Se o valor for zero e não houver formalização, não incluir nas estatísticas de especialista para evitar linhas indesejadas
            if ($val === 0.0 && $status !== 'formalizada') continue;

            $stats['total_value'] += $val;
            if ($status === 'formalizada') {
                $stats['formalized_value'] += $val;
                $stats['formalized_count']++;
            }

            // Agrupar por especialista
            if (!isset($stats['by_specialist'][$spec])) {
                $stats['by_specialist'][$spec] = ['count' => 0, 'value' => 0, 'formalized_value' => 0];
            }
            $stats['by_specialist'][$spec]['count']++;
            $stats['by_specialist'][$spec]['value'] += $val;
            if ($status === 'formalizada') {
                $stats['by_specialist'][$spec]['formalized_value'] += $val;
            }

            // Agrupar por status
            if (!isset($stats['by_status'][$status])) {
                $stats['by_status'][$status] = 0;
            }
            $stats['by_status'][$status]++;
        }

        // --- Atividade de Login ---
        $loginActivity = [];
        try {
            $loginQuery = "SELECT name, user_type, last_login FROM user_admin WHERE last_login IS NOT NULL";
            if (!empty($specialist)) {
                $loginQuery .= " AND name = ?";
                $stmtLogin = $pdo->prepare($loginQuery);
                $stmtLogin->execute([$specialist]);
            } else {
                $stmtLogin = $pdo->query($loginQuery);
            }
            $loginActivity = $stmtLogin->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            logError("Erro ao buscar atividade de login: " . $e->getMessage());
        }

        // Retornar os dados para que o JS gere o PDF/Excel
        jsonResponse(true, [
            'proposals' => $proposals,
            'stats' => $stats,
            'login_activity' => $loginActivity,
            'filters' => [
                'year' => $year,
                'month' => $month,
                'specialist' => $specialist
            ],
            'generated_at' => date('d/m/Y H:i:s')
        ]);
            
    } catch (Exception $e) {
        logError("Erro ao gerar relatório: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao gerar relatório: " . $e->getMessage());
    }
    break;

// ============ NOVA AÇÃO: EXCLUIR PROPOSTA ============
case 'delete_proposal':
    try {
        // Verifica se o ID da proposta foi fornecido
        if (empty($input['proposal_id'])) {
            jsonResponse(false, null, "ID da proposta não especificado");
        }
        $proposalId = (int)$input['proposal_id']; // Converte o ID para inteiro

        // Iniciar transação para garantir que tudo seja deletado ou nada
        $pdo->beginTransaction();

        // 1. Deletar documentos relacionados da tabela proposal_documents
        $stmtDocs = $pdo->prepare("DELETE FROM proposal_documents WHERE proposal_id = ?");
        $stmtDocs->execute([$proposalId]);

        // 2. Query para deletar a proposta do banco de dados
        // Apenas a proposta e seus documentos (se houver)
        $stmt = $pdo->prepare("DELETE FROM proposals WHERE id = ?");
        $result = $stmt->execute([$proposalId]);

        // Verifica se a deleção foi bem-sucedida
        if ($result) {
            $pdo->commit();
            logError("Proposta #$proposalId removida do banco de dados");
            jsonResponse(true, ['message' => 'Proposta removida com sucesso!']);
        } else {
            $pdo->rollBack();
            jsonResponse(false, null, "Erro ao remover proposta do banco");
        }
    } catch (PDOException $e) {
        logError("Erro ao deletar proposta: " . $e->getMessage());
        // ⭐ CORREÇÃO: Limpar output buffer antes de enviar resposta JSON
        jsonResponse(false, null, "Erro no banco de dados: " . $e->getMessage());
    }
    break;

// ============ FIM DOS ENDPOINTS PARA CONTATOS E CLIENTES ============

// ============================================================
// VERIFICAÇÃO DE ACESSO — ENVIAR ALERTA DE SEGURANÇA POR EMAIL
// ============================================================
case 'send_security_alert':
    try {
        $alertName    = isset($input['user_name'])   ? sanitizeInput($input['user_name'])   : 'Desconhecido';
        $alertEmail   = isset($input['user_email'])  ? sanitizeInput($input['user_email'])  : '';
        $alertIP      = isset($input['user_ip'])     ? sanitizeInput($input['user_ip'])     : 'Desconhecido';
        $alertDevice  = isset($input['device_name']) ? sanitizeInput($input['device_name']) : 'Desconhecido';
        $alertAttempt = isset($input['attempts'])    ? (int)$input['attempts']              : 0;
        $alertDate    = date('d/m/Y H:i:s');

        // Garantir tabelas necessárias
        $pdo->exec("CREATE TABLE IF NOT EXISTS ccapi_security_tokens (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            token       VARCHAR(64)  NOT NULL UNIQUE,
            action_type VARCHAR(20)  NOT NULL,
            user_ip     VARCHAR(45)  NOT NULL,
            user_email  VARCHAR(255) NOT NULL,
            used        TINYINT(1)   DEFAULT 0,
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $pdo->exec("CREATE TABLE IF NOT EXISTS ccapi_blocked_ips (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            ip         VARCHAR(45)  NOT NULL UNIQUE,
            user_email VARCHAR(255) NOT NULL DEFAULT '',
            blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        // Gerar tokens únicos
        $tokenLiberar  = bin2hex(random_bytes(24));
        $tokenBloquear = bin2hex(random_bytes(24));

        $stmtTok = $pdo->prepare("INSERT INTO ccapi_security_tokens (token, action_type, user_ip, user_email) VALUES (?,?,?,?)");
        $stmtTok->execute([$tokenLiberar,  'liberar',  $alertIP, $alertEmail]);
        $stmtTok->execute([$tokenBloquear, 'bloquear', $alertIP, $alertEmail]);

        $base        = 'https://administradores.ccapi.com.br/admin-api.php';
        $urlLiberar  = $base . '?action=security_action&token=' . $tokenLiberar;
        $urlBloquear = $base . '?action=security_action&token=' . $tokenBloquear;

        $subject = "⚠️ Alerta de Segurança — Verificação de Acesso CCAPI";
        $msg = "
            <div style='background:#fff7ed;border-left:4px solid #f97316;padding:14px 18px;border-radius:6px;margin-bottom:20px;'>
                <strong style='color:#c2410c;'>⚠️ Atenção: falha na verificação de acesso periódica do sistema CCAPI</strong>
            </div>
            <p style='color:#334155;margin-bottom:18px;'>
                Um usuário está falhando na verificação de acesso periódica. Confira os detalhes abaixo e tome uma ação.
            </p>
            <table style='width:100%;border-collapse:collapse;margin-bottom:24px;font-size:0.92rem;'>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;width:42%;border:1px solid #e2e8f0;'>Nome de Login</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;color:#1e293b;'><strong>$alertName</strong></td>
                </tr>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>E-mail</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;color:#1e293b;'>$alertEmail</td>
                </tr>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Endereço IP</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;'><code style='background:#f1f5f9;padding:2px 8px;border-radius:4px;color:#1e293b;'>$alertIP</code></td>
                </tr>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Dispositivo / Navegador</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;color:#1e293b;'>$alertDevice</td>
                </tr>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Tentativas Erradas</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;'><strong style='color:#dc2626;'>$alertAttempt de 5</strong></td>
                </tr>
                <tr>
                    <td style='padding:9px 12px;background:#f8fafc;font-weight:600;color:#475569;border:1px solid #e2e8f0;'>Data e Hora</td>
                    <td style='padding:9px 12px;border:1px solid #e2e8f0;color:#1e293b;'>$alertDate</td>
                </tr>
            </table>
            <p style='color:#475569;margin-bottom:24px;font-size:0.9rem;line-height:1.6;'>
                Se você reconhece este usuário, clique em <strong>Liberar Acesso</strong> e confirme com a senha de suporte.<br>
                Caso suspeite de acesso indevido, clique em <strong>Bloquear IP</strong> para bloquear o acesso imediatamente.
            </p>
            <table style='width:100%;'>
                <tr>
                    <td style='padding:8px;text-align:center;'>
                        <a href='$urlLiberar'
                           style='display:inline-block;padding:14px 32px;background:#16a34a;color:#ffffff;
                                  text-decoration:none;border-radius:8px;font-weight:700;font-size:0.95rem;
                                  letter-spacing:.3px;'>
                            ✅ Liberar Acesso
                        </a>
                    </td>
                    <td style='padding:8px;text-align:center;'>
                        <a href='$urlBloquear'
                           style='display:inline-block;padding:14px 32px;background:#dc2626;color:#ffffff;
                                  text-decoration:none;border-radius:8px;font-weight:700;font-size:0.95rem;
                                  letter-spacing:.3px;'>
                            🚫 Bloquear IP
                        </a>
                    </td>
                </tr>
            </table>
            <p style='margin-top:16px;font-size:0.75rem;color:#94a3b8;text-align:center;'>
                Cada link pode ser usado apenas uma vez.
            </p>
        ";

        // Enviar para xavier E para suporte
        logError("[send_security_alert] Tentando enviar email. IP=$alertIP Nome=$alertName");
        $sent1 = sendNotificationEmail('xavier.oliveira013@gmail.com', $subject, $msg);
        logError("[send_security_alert] xavier: " . ($sent1 ? 'OK' : 'FALHOU'));
        $sent2 = sendNotificationEmail('suporte@ccapiconsultoriaemcredito.com', $subject, $msg);
        logError("[send_security_alert] suporte: " . ($sent2 ? 'OK' : 'FALHOU'));
        jsonResponse(true, ['sent' => ($sent1 || $sent2), 'sent_xavier' => $sent1, 'sent_suporte' => $sent2]);

    } catch (Exception $e) {
        logError("Erro em send_security_alert: " . $e->getMessage());
        jsonResponse(false, null, "Erro ao processar alerta de seguranca");
    }
    break;

// ============================================================
// VERIFICAÇÃO DE ACESSO — AÇÃO VIA LINK DO EMAIL (liberar/bloquear)
// Acessado via GET pelo link clicado no email
// ============================================================
case 'security_action':
    $saToken = isset($_GET['token']) ? trim($_GET['token']) : '';

    if (empty($saToken)) {
        http_response_code(400);
        die('<p style="font-family:Arial;text-align:center;margin-top:4rem;color:#dc2626;">Token invalido ou ausente.</p>');
    }

    // Helper: renderiza pagina HTML simples
    function saPage($icone, $titulo, $cor, $corpo) {
        header('Content-Type: text/html; charset=UTF-8');
        echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>CCAPI Seguranca</title>
        <style>*{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;
             justify-content:center;min-height:100vh;padding:1rem}
        .card{background:#fff;border-radius:16px;padding:2.5rem 2rem;max-width:440px;
              width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12)}
        .logo{color:#2563eb;font-size:1rem;font-weight:700;margin-bottom:1.5rem}
        h1{font-size:1.35rem;margin-bottom:.8rem}
        p{color:#475569;line-height:1.6;font-size:.9rem;margin-top:.5rem}
        code{background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:.88rem}
        </style></head><body>
        <div class="card">
          <div class="logo">CCAPI Consultoria</div>
          <div style="font-size:2.8rem;margin-bottom:1rem;">' . $icone . '</div>
          <h1 style="color:' . $cor . ';">' . $titulo . '</h1>
          <div style="color:#475569;font-size:.9rem;margin-top:.8rem;line-height:1.6;">' . $corpo . '</div>
        </div></body></html>';
        exit;
    }

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS ccapi_security_tokens (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            token       VARCHAR(64)  NOT NULL UNIQUE,
            action_type VARCHAR(20)  NOT NULL,
            user_ip     VARCHAR(45)  NOT NULL,
            user_email  VARCHAR(255) NOT NULL,
            used        TINYINT(1)   DEFAULT 0,
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $stmtTok = $pdo->prepare("SELECT * FROM ccapi_security_tokens WHERE token = ? AND used = 0 LIMIT 1");
        $stmtTok->execute([$saToken]);
        $tokenData = $stmtTok->fetch(PDO::FETCH_ASSOC);

        if (!$tokenData) {
            saPage('&#9888;', 'Link expirado ou ja utilizado', '#dc2626',
                'Este link de seguranca nao e mais valido. Cada link so pode ser usado uma vez.');
        }

        $saAction = $tokenData['action_type'];
        $saIP     = $tokenData['user_ip'];
        $saEmail  = $tokenData['user_email'];

        // ─── LIBERAR ─────────────────────────────────────────────────
        if ($saAction === 'liberar') {

            if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['admin_pass'])) {
                if (trim($_POST['admin_pass']) === 'Suporte@1281') {
                    $pdo->prepare("UPDATE ccapi_security_tokens SET used = 1 WHERE token = ?")
                        ->execute([$saToken]);
                    saPage('&#10003;', 'Acesso liberado com sucesso!', '#16a34a',
                        'O usuario <strong>' . htmlspecialchars($saEmail) . '</strong> pode continuar acessando o sistema normalmente.');
                } else {
                    // Senha errada: reexibir formulário com mensagem de erro
                    $erroHtml = '<p style="color:#dc2626;margin-bottom:1rem;font-size:.88rem;">Senha incorreta. Tente novamente.</p>';
                }
            }

            $erroHtml   = $erroHtml ?? '';
            $actionUrl  = htmlspecialchars('https://administradores.ccapi.com.br/admin-api.php?action=security_action&token=' . $saToken);
            header('Content-Type: text/html; charset=UTF-8');
            echo '<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Liberar Acesso - CCAPI</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;
             justify-content:center;min-height:100vh;padding:1rem}
        .card{background:#fff;border-radius:16px;padding:2.5rem 2rem;max-width:420px;
              width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12)}
        .logo{color:#2563eb;font-size:1rem;font-weight:700;margin-bottom:1.5rem}
        h2{font-size:1.25rem;color:#0f172a;margin-bottom:.5rem}
        p.sub{color:#64748b;font-size:.88rem;margin-bottom:1.4rem;line-height:1.5}
        input[type=password]{width:100%;padding:.75rem 1rem;border:2px solid #e2e8f0;
            border-radius:9px;font-size:1rem;outline:none;margin-bottom:1rem;transition:border-color .2s}
        input[type=password]:focus{border-color:#2563eb}
        button{width:100%;padding:.8rem;border:none;border-radius:9px;
               background:#16a34a;color:#fff;font-size:1rem;font-weight:700;cursor:pointer}
        button:hover{background:#15803d}
    </style>
</head>
<body>
<div class="card">
    <div class="logo">CCAPI Consultoria</div>
    <div style="font-size:2.5rem;margin-bottom:1rem;">&#128275;</div>
    <h2>Liberar Acesso</h2>
    <p class="sub">Informe a senha de administrador para liberar o usuario <strong>' . htmlspecialchars($saEmail) . '</strong>.</p>
    ' . $erroHtml . '
    <form method="POST" action="' . $actionUrl . '">
        <input type="password" name="admin_pass" placeholder="Senha de administrador" required autofocus>
        <button type="submit">Confirmar Liberacao</button>
    </form>
</div>
</body>
</html>';
            exit;
        }

        // ─── BLOQUEAR ─────────────────────────────────────────────────
        if ($saAction === 'bloquear') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ccapi_blocked_ips (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                ip         VARCHAR(45)  NOT NULL UNIQUE,
                user_email VARCHAR(255) NOT NULL DEFAULT '',
                blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ip (ip)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $pdo->prepare("INSERT IGNORE INTO ccapi_blocked_ips (ip, user_email) VALUES (?,?)")
                ->execute([$saIP, $saEmail]);
            $pdo->prepare("UPDATE ccapi_security_tokens SET used = 1 WHERE token = ?")
                ->execute([$saToken]);

            saPage('&#128683;', 'IP Bloqueado com Sucesso', '#dc2626',
                'O endereco <code>' . htmlspecialchars($saIP) . '</code> foi bloqueado no sistema.<br>
                 Usuario: <strong>' . htmlspecialchars($saEmail) . '</strong>');
        }

    } catch (Exception $e) {
        logError("Erro em security_action: " . $e->getMessage());
        die('<p style="font-family:Arial;text-align:center;color:#dc2626;margin-top:4rem;">Erro ao processar acao.</p>');
    }
    break;

// ============================================================
// VERIFICAÇÃO DE ACESSO — BLOQUEAR IP VIA JAVASCRIPT
// ============================================================
case 'block_ip':
    try {
        $ipToBlock    = isset($input['ip'])    ? sanitizeInput($input['ip'])    : '';
        $emailToBlock = isset($input['email']) ? sanitizeInput($input['email']) : '';
        if (empty($ipToBlock)) {
            jsonResponse(false, null, 'IP nao informado');
        }
        $pdo->exec("CREATE TABLE IF NOT EXISTS ccapi_blocked_ips (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            ip         VARCHAR(45)  NOT NULL UNIQUE,
            user_email VARCHAR(255) NOT NULL DEFAULT '',
            blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $pdo->prepare("INSERT IGNORE INTO ccapi_blocked_ips (ip, user_email) VALUES (?,?)")
            ->execute([$ipToBlock, $emailToBlock]);
        logError("IP bloqueado automaticamente pelo sistema: $ipToBlock ($emailToBlock)");
        jsonResponse(true, ['message' => 'IP bloqueado']);
    } catch (Exception $e) {
        logError("Erro em block_ip: " . $e->getMessage());
        jsonResponse(false, null, 'Erro ao bloquear IP');
    }
    break;

        jsonResponse(false, null, "Acao nao implementada");
        break;
}

?>