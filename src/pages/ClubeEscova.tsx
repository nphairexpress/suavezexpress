import { useState } from "react";
import {
  ArrowDown,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge, GlassCard, cx } from "@design-system";
import { CountUp, Reveal, useInView, prefersReducedMotion } from "@/components/clube/Reveal";

/**
 * Clube da Escova — página pública de vendas (assinatura recorrente Asaas).
 * Rota /clube-escova (sem login). Tráfego = Instagram no celular → mobile-first.
 *
 * Design system NP Express com tema ESCURO FIXO: a rota fica isolada em np-legacy (tema claro
 * forçado no <html>), então o tema escuro é aplicado aqui no wrapper raiz (data-theme="dark")
 * e só se usam tokens --np-* e componentes de @design-system. Nada de classe shadcn de tema.
 */

const WHATS =
  "https://wa.me/5519990091315?text=Quero%20saber%20do%20Clube%20da%20Escova";

/* ---------- classes de apresentação (só tokens --np-*) ---------- */

// .np-app a pinta todo link de âmbar e sublinha no hover: os links-botão anulam isso.
const LINK_BTN = "no-underline hover:!no-underline";
const BTN_PRIMARY = cx(
  "np-btn np-btn--primary np-btn--lg",
  LINK_BTN,
  "!text-[color:var(--np-text-on-accent)] font-bold",
);
const BTN_OUTLINE_ACCENT = cx(
  "np-btn np-btn--secondary np-btn--lg",
  LINK_BTN,
  "!border-[color:var(--np-accent-border)] !text-[color:var(--np-accent-text)] font-bold",
  "hover:!bg-[color:var(--np-accent)] hover:!text-[color:var(--np-text-on-accent)]",
);

const T1 = "text-[color:var(--np-text-primary)]";
const T2 = "text-[color:var(--np-text-secondary)]";
const T3 = "text-[color:var(--np-text-tertiary)]";
const ACCENT = "text-[color:var(--np-accent-text)]";
const DISPLAY = "np-display";
const H2 = cx(DISPLAY, T1, "text-center text-3xl sm:text-4xl");
const SECTION_ALT =
  "border-y border-[color:var(--np-divider)] bg-[color:var(--np-surface-inset)]";

type Comprimento = "curto" | "longo";

interface Plano {
  escovas: 4 | 8;
  preco: Record<Comprimento, number>;
  avulso: Record<Comprimento, number>;
  link: Record<Comprimento, string>;
  destaque?: boolean;
}

const PLANOS: Plano[] = [
  {
    escovas: 4,
    preco: { curto: 197, longo: 247 },
    avulso: { curto: 308, longo: 388 }, // 4 × R$77 / 4 × R$97
    link: {
      curto: "https://www.asaas.com/c/ctbr9733y2dye8r1",
      longo: "https://www.asaas.com/c/a8d8qc2fryztsjeq",
    },
    destaque: true,
  },
  {
    escovas: 8,
    preco: { curto: 347, longo: 447 },
    avulso: { curto: 616, longo: 776 }, // 8 × R$77 / 8 × R$97
    link: {
      curto: "https://www.asaas.com/c/wqep6rzf1vn2g27r",
      longo: "https://www.asaas.com/c/2xqfpqmyug6kbq3h",
    },
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "E se eu não usar todas as escovas do mês?",
    a: "Elas valem dentro do mês e não acumulam pro seguinte. O Clube foi feito pra quem vem toda semana — se você faz escova umas 2 vezes por mês, o avulso ainda é a melhor conta pra você. A gente prefere te falar isso agora do que te ver pagando por algo que não usa.",
  },
  {
    q: "Tem fidelidade?",
    a: "Não. Você cancela quando quiser, sem multa e sem letra miúda. Se o Clube não encaixar na sua rotina, é só avisar que a gente encerra a assinatura.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "É uma assinatura mensal automática no cartão, pelo Asaas — plataforma de pagamento usada por milhares de empresas no Brasil, ambiente seguro. Também dá pra pagar por Pix ou boleto. Você assina uma vez e não pensa mais nisso.",
  },
  {
    q: "Cabelo longo paga mais?",
    a: "Sim, tem plano próprio. Consideramos longo o cabelo que passa da linha do busto — leva mais produto e mais tempo de secador. E a economia em relação ao avulso é ainda maior.",
  },
  {
    q: "Posso usar duas escovas no mesmo dia ou na mesma semana?",
    a: "Pode. As escovas são suas dentro do mês: duas na mesma semana, ou até no mesmo dia — compromisso de manhã e festa à noite, tá valendo. O único limite é o total do seu plano.",
  },
  {
    q: "Escova modelada entra no plano?",
    a: "O plano cobre a escova lisa. Quer modelada? É só pedir na hora e somar R$10 na comanda daquele dia. Simples assim.",
  },
  {
    q: "Preciso agendar horário?",
    a: "Não — aqui ninguém agenda. Você chega, pega a fila digital pelo celular e acompanha sua vez de onde estiver. Assinante entra na mesma fila de todo mundo, do jeito que você já conhece.",
  },
];

/* ---------- seções ---------- */

function PlanoCard({ p, comprimento }: { p: Plano; comprimento: Comprimento }) {
  const preco = p.preco[comprimento];
  const avulso = p.avulso[comprimento];
  const economia = avulso - preco;
  const porEscova = Math.round(preco / p.escovas);

  return (
    <GlassCard
      lift
      selected={p.destaque}
      glow={p.destaque}
      tone={p.destaque ? "strong" : "default"}
      className={cx(
        "relative flex flex-col",
        !p.destaque && "hover:!border-[color:var(--np-accent-border)]",
      )}
    >
      {p.destaque && (
        <Badge
          tone="solid"
          className="absolute -top-3 left-6 uppercase tracking-[0.12em] !text-[11px] font-bold"
        >
          Mais escolhido
        </Badge>
      )}

      <p className={cx("text-xs font-semibold uppercase tracking-[0.2em]", T2)}>
        {p.escovas} escovas por mês
      </p>
      <p className={cx(DISPLAY, T1, "mt-1 text-2xl")}>
        {p.escovas === 4 ? "Uma por semana" : "Duas por semana"}
      </p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span
          className={cx(
            DISPLAY,
            "text-[2.6rem] font-black leading-none tabular-nums",
            "text-[color:var(--np-accent-display)]",
          )}
        >
          R${preco}
        </span>
        <span className={cx("text-sm", T2)}>/mês</span>
      </div>
      <p className={cx("mt-2 text-sm", T2)}>
        Sai a <b className={cx(T1, "font-semibold tabular-nums")}>R${porEscova} por escova</b>
        <span className={cx(T3, "tabular-nums")}> · avulso custaria R${avulso}</span>
      </p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-[color:var(--np-positive-text)]">
        <Wallet className="h-4 w-4" aria-hidden />
        R${economia} de volta no seu bolso, todo mês
      </p>

      <ul
        className={cx(
          "mt-6 space-y-2.5 border-t border-[color:var(--np-divider)] pt-5 text-sm",
          T2,
        )}
      >
        <li className="flex items-start gap-2">
          <Check className={cx("mt-0.5 h-4 w-4 shrink-0", ACCENT)} aria-hidden />
          Escovas valem dentro do mês
        </li>
        <li className="flex items-start gap-2">
          <Check className={cx("mt-0.5 h-4 w-4 shrink-0", ACCENT)} aria-hidden />
          Sem hora marcada — fila digital pelo celular
        </li>
        <li className="flex items-start gap-2">
          <Check className={cx("mt-0.5 h-4 w-4 shrink-0", ACCENT)} aria-hidden />
          Cancela quando quiser, sem fidelidade
        </li>
      </ul>

      <a
        href={p.link[comprimento]}
        target="_blank"
        rel="noopener noreferrer"
        className={cx("mt-6 w-full", p.destaque ? BTN_PRIMARY : BTN_OUTLINE_ACCENT)}
      >
        Assinar agora
      </a>
    </GlassCard>
  );
}

function ContaNaMesa() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const shown = inView || prefersReducedMotion();
  const barBase =
    "h-9 rounded-lg transition-[width] duration-1000 ease-out motion-reduce:transition-none";
  const track = "w-full rounded-lg bg-[color:var(--np-surface-inset)]";

  return (
    <div ref={ref}>
      <GlassCard radius="xl" className="p-6 sm:!p-8">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className={cx("text-sm", T2)}>4 escovas avulsas no mês</span>
              <CountUp
                to={308}
                className={cx(
                  DISPLAY,
                  T3,
                  "text-2xl tabular-nums line-through decoration-2",
                )}
              />
            </div>
            <div className={track}>
              <div
                className={cx(barBase, "bg-[color:var(--np-graphite-500)]")}
                style={{ width: shown ? "100%" : "0%" }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className={cx("text-sm font-semibold", T1)}>As mesmas 4 no Clube</span>
              <CountUp
                to={197}
                className={cx(
                  DISPLAY,
                  "text-3xl font-black tabular-nums text-[color:var(--np-accent-display)]",
                )}
              />
            </div>
            <div className={track}>
              <div
                className={cx(
                  barBase,
                  "bg-[color:var(--np-accent)] shadow-[var(--np-shadow-accent)]",
                )}
                style={{ width: shown ? "64%" : "0%" }}
              />
            </div>
          </div>
        </div>

        <p
          className={cx(
            DISPLAY,
            T1,
            "mt-8 border-t border-[color:var(--np-divider)] pt-6 text-center text-xl leading-snug sm:text-2xl",
          )}
        >
          Sai a <span className={ACCENT}>R$49 cada escova</span>. São
          R$111 que ficam com você — todo santo mês.
        </p>
        <p className={cx("mt-2 text-center text-sm", T2)}>
          No cabelo longo a diferença é ainda maior: R$141 por mês.
        </p>
      </GlassCard>
    </div>
  );
}

function FaqItem({
  item,
  open,
  onToggle,
}: {
  item: { q: string; a: string };
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <GlassCard
      padding={0}
      selected={open}
      className={cx("overflow-hidden", open && "!bg-[color:var(--np-surface-glass-strong)]")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[color:var(--np-focus-ring)] focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <span className={cx("text-[15px] font-semibold", T1)}>{item.q}</span>
        <ChevronDown
          className={cx(
            "h-5 w-5 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
            ACCENT,
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className={cx("px-5 pb-5 text-sm leading-relaxed", T2)}>{item.a}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function Marca() {
  return (
    <p className={cx(DISPLAY, T1, "text-sm uppercase tracking-[0.28em]")}>
      NP Hair <span className={ACCENT}>Express</span>
    </p>
  );
}

/* ---------- página ---------- */

export default function ClubeEscova() {
  const [comprimento, setComprimento] = useState<Comprimento>("curto");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const hero = useInView<HTMLDivElement>(0, false);

  return (
    <div
      data-theme="dark"
      className={cx("np-app np-bg min-h-screen overflow-x-clip text-base antialiased", T1)}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Marca />
          <a
            href="#planos"
            className={cx(
              "np-btn np-btn--primary np-btn--sm hidden rounded-full px-5 sm:inline-flex",
              LINK_BTN,
              "!text-[color:var(--np-text-on-accent)] font-bold",
            )}
          >
            Assinar
          </a>
        </div>
      </header>

      {/* 1 · HERO */}
      <section
        ref={hero.ref}
        className="relative overflow-hidden px-5 pb-16 pt-14 sm:pb-24 sm:pt-20"
      >
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(closest-side, var(--np-accent-glow), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <Badge
              tone="accent"
              live
              size="lg"
              className="uppercase tracking-[0.14em] !text-xs font-bold"
            >
              Só 30 vagas no 1º lote
            </Badge>
          </Reveal>

          <Reveal delay={100}>
            <h1
              className={cx(
                DISPLAY,
                T1,
                "mt-6 text-[2.05rem] leading-[1.1] min-[420px]:text-4xl sm:text-6xl sm:leading-[1.05]",
              )}
            >
              Escova toda semana.
              <br />
              <em className="not-italic text-[color:var(--np-accent-display)] [text-shadow:var(--np-accent-text-glow)]">
                Preço fechado.
              </em>
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className={cx("mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-lg", T2)}>
              O Clube da Escova é a assinatura do NP Hair Express: 4 ou 8
              escovas por mês pagando bem menos que o avulso. A partir de{" "}
              <b className={cx(T1, "font-semibold tabular-nums")}>R$197/mês</b> — até{" "}
              <b className={cx(T1, "font-semibold tabular-nums")}>R$329 de economia</b> todo mês.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 flex flex-col items-center gap-4">
              <a href="#planos" className={cx(BTN_PRIMARY, "w-full max-w-xs sm:w-auto sm:px-8")}>
                Quero ver os planos
                <ArrowDown className="h-5 w-5" aria-hidden />
              </a>
              <p className={cx("text-xs uppercase tracking-[0.18em]", T3)}>
                sem hora marcada · fila digital · Salto/SP
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2 · A CONTA NA MESA */}
      <section className="px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className={H2}>A conta na mesa</h2>
            <p className={cx("mt-3 text-center", T2)}>
              Mesma escova, mesmas profissionais, mesma cadeira. Só o preço que
              muda.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8">
            <ContaNaMesa />
          </Reveal>
        </div>
      </section>

      {/* 3 · COMO FUNCIONA */}
      <section className={cx(SECTION_ALT, "px-5 py-14 sm:py-20")}>
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className={H2}>Como funciona</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: "Assine em 1 minuto",
                text: "Escolhe o plano, paga pelo celular no ambiente seguro do Asaas e pronto: você já é do Clube.",
              },
              {
                icon: CalendarClock,
                title: "Chegue sem marcar",
                text: "Terça a sábado, no horário que encaixar no seu dia. Pegou a fila digital, é só acompanhar sua vez pelo celular.",
              },
              {
                icon: Sparkles,
                title: "Saia pronta, sem pagar",
                text: "Sua escova do mês já está paga. Levantou da cadeira, tá liberada — sem abrir a carteira.",
              },
            ].map((s, i) => (
              <Reveal key={s.title} delay={i * 120} className="h-full">
                <GlassCard lift className="h-full">
                  <span className={cx(DISPLAY, T3, "text-sm tabular-nums")}>0{i + 1}</span>
                  <span className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--np-accent-soft)]">
                    <s.icon className={cx("h-6 w-6", ACCENT)} aria-hidden />
                  </span>
                  <h3 className={cx(DISPLAY, T1, "mt-4 text-lg")}>{s.title}</h3>
                  <p className={cx("mt-2 text-sm leading-relaxed", T2)}>{s.text}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · PLANOS */}
      <section id="planos" className="scroll-mt-20 px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className={H2}>Escolha o seu plano</h2>
            <p className={cx("mt-3 text-center", T2)}>
              Assinatura mensal pelo Asaas. Sem fidelidade — cancela quando
              quiser.
            </p>
          </Reveal>

          {/* toggle comprimento */}
          <Reveal delay={100}>
            <div className="mt-8 flex justify-center">
              <div
                role="group"
                aria-label="Comprimento do cabelo"
                className="inline-flex rounded-full border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] p-1 backdrop-blur-xl"
              >
                {(
                  [
                    ["curto", "Curto ou médio"],
                    ["longo", "Longo"],
                  ] as [Comprimento, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setComprimento(value)}
                    aria-pressed={comprimento === value}
                    className={cx(
                      "min-h-[44px] rounded-full px-5 py-2 text-sm font-bold transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--np-focus-ring)] focus-visible:ring-0 focus-visible:ring-offset-0",
                      comprimento === value
                        ? "bg-[color:var(--np-accent)] text-[color:var(--np-text-on-accent)]"
                        : "text-[color:var(--np-text-secondary)] hover:text-[color:var(--np-text-primary)]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className={cx("mt-3 text-center text-xs", T3)}>
              Longo = passa da linha do busto
            </p>
          </Reveal>

          <div
            key={comprimento}
            className="mt-8 grid gap-6 animate-fade-in motion-reduce:animate-none sm:grid-cols-2"
          >
            {PLANOS.map((p) => (
              <PlanoCard key={p.escovas} p={p} comprimento={comprimento} />
            ))}
          </div>

          <p className={cx("mt-6 text-center text-xs", T3)}>
            Escova modelada soma R$10 na hora. Pagamento seguro pelo Asaas —
            cartão, Pix ou boleto.
          </p>
        </div>
      </section>

      {/* 5 · PRA QUEM É */}
      <section className={cx(SECTION_ALT, "px-5 py-14 sm:py-20")}>
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className={H2}>O Clube é pra você que&hellip;</h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {[
              {
                icon: BadgeCheck,
                title: "…já vem toda semana",
                text: "Se escova já faz parte da sua rotina, você está pagando caro demais no avulso. Era só isso que faltava te contar.",
              },
              {
                icon: Clock,
                title: "…trabalha com o cabelo feito",
                text: "Antes do expediente, da reunião, do evento. Cabelo arrumado vira compromisso fixo — com preço fixo.",
              },
              {
                icon: Wallet,
                title: "…cansou de pagar avulso",
                text: "Um valor fechado por mês, sem surpresa na comanda. Você sabe exatamente quanto o seu cabelo custa.",
              },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 100}>
                <GlassCard padding={20} className="flex items-start gap-4">
                  <span className="shrink-0 rounded-xl bg-[color:var(--np-accent-soft)] p-2.5">
                    <b.icon className={cx("h-6 w-6", ACCENT)} aria-hidden />
                  </span>
                  <div>
                    <h3 className={cx(DISPLAY, T1, "text-xl")}>{b.title}</h3>
                    <p className={cx("mt-1 text-sm leading-relaxed", T2)}>{b.text}</p>
                  </div>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · FAQ / OBJEÇÕES */}
      <section className="px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className={H2}>Pode perguntar</h2>
            <p className={cx("mt-3 text-center", T2)}>
              As dúvidas que toda cliente tem antes de assinar — respondidas sem
              enrolação.
            </p>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={Math.min(i * 60, 240)}>
                <FaqItem
                  item={item}
                  open={faqOpen === i}
                  onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · URGÊNCIA + CTA FINAL (único bloco âmbar sólido da página) */}
      <section className="px-5 pb-20 pt-4 sm:pb-24">
        <Reveal>
          <GlassCard
            tone="accent"
            radius="xl"
            padding={0}
            className="relative mx-auto max-w-4xl overflow-hidden !px-6 !py-12 text-center sm:!px-12 sm:!py-16"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, var(--np-white-40), transparent 70%)",
              }}
              aria-hidden
            />
            <p className="np-on-accent-2 relative text-xs font-bold uppercase tracking-[0.22em]">
              Primeiro lote · 30 assinantes
            </p>
            <h2
              className={cx(
                DISPLAY,
                "np-on-accent relative mx-auto mt-3 max-w-xl text-3xl leading-tight sm:text-4xl",
              )}
            >
              As primeiras 30 assinantes entram com esse preço.
            </h2>
            <p className="np-on-accent-2 relative mx-auto mt-4 max-w-md text-[15px] leading-relaxed">
              Depois que o lote fechar, fecha mesmo — a agenda da equipe tem
              limite. Se escova toda semana já é a sua vida, garante a sua vaga
              agora.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#planos"
                className={cx(
                  "np-btn np-btn--dark np-btn--lg w-full font-bold sm:w-auto sm:px-8",
                  LINK_BTN,
                  "!text-[color:var(--np-accent-hover)]",
                )}
              >
                Garantir minha vaga
              </a>
              <a
                href={WHATS}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(
                  "np-btn np-btn--lg w-full font-bold sm:w-auto sm:px-8",
                  LINK_BTN,
                  "border-2 !border-[color:var(--np-text-on-accent-2)] bg-transparent !text-[color:var(--np-text-on-accent)]",
                  "hover:!bg-[color:var(--np-on-accent-overlay)]",
                )}
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Tirar dúvida no WhatsApp
              </a>
            </div>
          </GlassCard>
        </Reveal>
      </section>

      {/* 8 · RODAPÉ */}
      <footer className="border-t border-[color:var(--np-divider)] px-5 pb-28 pt-10 text-center sm:pb-10">
        <Marca />
        <p className={cx("mt-3 inline-flex items-center gap-1.5 text-xs", T2)}>
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          R. 7 de Setembro, 374 — Centro, Salto/SP · terça a sábado
        </p>
        <div className="mt-3">
          <a
            href="https://www.instagram.com/nphairexpress"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold"
          >
            <Instagram className="h-3.5 w-3.5" aria-hidden />
            @nphairexpress
          </a>
        </div>
      </footer>

      {/* CTA sticky mobile */}
      <div
        className={cx(
          "fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] px-4 py-3 backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none sm:hidden",
          hero.inView ? "translate-y-full" : "translate-y-0",
        )}
      >
        <a href="#planos" className={cx(BTN_PRIMARY, "w-full")}>
          Assinar por R$197/mês
        </a>
      </div>
    </div>
  );
}
