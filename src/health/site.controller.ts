import { Controller, Get, Header } from '@nestjs/common';

// Página inicial e política de privacidade exigidas pela tela de
// consentimento OAuth do Google (app "LPC Fotos", projeto GCP lpc-fotos).
const page = (title: string, body: string) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 16px;line-height:1.55;color:#222}h1{font-size:1.5rem}a{color:#b5121b}</style>
</head><body>${body}</body></html>`;

@Controller()
export class SiteController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  home() {
    return page(
      'LPC Fotos',
      `<h1>LPC Fotos — Loucos por Coxinha</h1>
<p>Sistema interno de controle de caixa das lojas Loucos por Coxinha (Shopping e Centro):
faturamento diário, sangrias, retiradas, cofre e escala da equipe.</p>
<p>As fotos de comprovantes, maquinetas e atestados enviadas pelo app são guardadas no
Google Drive da própria empresa, organizadas por tipo, loja, mês e dia.</p>
<p><a href="/privacidade">Política de Privacidade</a></p>`,
    );
  }

  @Get('privacidade')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy() {
    return page(
      'Política de Privacidade — LPC Fotos',
      `<h1>Política de Privacidade — LPC Fotos</h1>
<p>O LPC Fotos é uma ferramenta de uso interno da Loucos por Coxinha, usada apenas pela
equipe da empresa.</p>
<h2>Dados do Google</h2>
<p>O app usa a API do Google Drive com o escopo <code>drive.file</code>, que dá acesso
somente às pastas e arquivos criados pelo próprio app. Ele cria a pasta "LPC - Fotos" no
Drive da conta da empresa e guarda ali as fotos de comprovantes, maquinetas e atestados
enviadas pelo app. O app não lê, altera nem apaga nenhum outro arquivo do Drive.</p>
<h2>Uso e compartilhamento</h2>
<p>As fotos são usadas só para conferência do caixa e da escala, dentro da empresa. Nenhum
dado é vendido, compartilhado com terceiros ou usado para publicidade. O uso de
informações recebidas das APIs do Google segue a
<a href="https://developers.google.com/terms/api-services-user-data-policy">Política de
Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>
<h2>Remoção</h2>
<p>O acesso pode ser revogado a qualquer momento em
<a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
As fotos continuam no Drive da empresa e podem ser apagadas por lá.</p>
<h2>Contato</h2>
<p>natanaelmelo.dev@gmail.com</p>
<p><a href="/">Início</a></p>`,
    );
  }
}
