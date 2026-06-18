import type { Metadata } from 'next';
import { Section } from '@/components/Section';
import { ThemeSwitcherComponent } from '@/components/Theme/ThemeSwitcherComponent';
import { Button } from '@/components/UI/Button';
import { Text } from '@/components/UI/Text';
import { Title } from '@/components/UI/Title';
import { Anchor } from '@/components/UI/Anchor';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { Icon } from '@/components/UI/Icon';
import { Form } from '@/components/UI/Form';

export const metadata: Metadata = {
  title: 'Design System — Chaty',
  description: 'Visual showcase of all Chaty UI components and theme tokens.',
};

/* ─── Color swatch helper ─── */
function Swatch({
  label,
  bgVar,
  fgVar,
}: Readonly<{
  label: string;
  bgVar: string;
  fgVar?: string;
}>) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg border p-4"
      style={{ backgroundColor: `var(${bgVar})` }}
    >
      <span
        className="text-sm font-medium text-center"
        style={{ color: fgVar ? `var(${fgVar})` : undefined }}
      >
        {label}
      </span>
      <span
        className="text-xs tabular-nums opacity-70"
        style={{ color: fgVar ? `var(${fgVar})` : undefined }}
      >
        {bgVar}
      </span>
    </div>
  );
}

/* ─── Theme color section constants ─── */
const SURFACE_PAIRS = [
  { label: 'background', bg: '--background', fg: '--foreground' },
  { label: 'card', bg: '--card', fg: '--card-foreground' },
  { label: 'muted', bg: '--muted', fg: '--muted-foreground' },
  { label: 'secondary', bg: '--secondary', fg: '--secondary-foreground' },
] as const;

const SEMANTIC_COLORS = [
  { label: 'primary', bg: '--primary', fg: '--primary-foreground' },
  { label: 'accent', bg: '--accent', fg: '--accent-foreground' },
  { label: 'destructive', bg: '--destructive', fg: null },
  { label: 'success', bg: '--success', fg: null },
  { label: 'warning', bg: '--warning', fg: null },
  { label: 'error', bg: '--error', fg: null },
] as const;

const BORDER_COLORS = [
  { label: 'border', bg: '--border' },
  { label: 'input', bg: '--input' },
  { label: 'ring', bg: '--ring' },
] as const;

/* ─── Icon grid data ─── */
const ICON_NAMES = [
  'send', 'search', 'user', 'settings', 'close', 'check',
  'plus', 'trash', 'edit', 'menu', 'home', 'chat',
  'heart', 'star', 'info',
] as const;

const SELECT_OPTIONS = [
  { value: 'option-a', label: 'Option A' },
  { value: 'option-b', label: 'Option B' },
  { value: 'option-c', label: 'Option C' },
] as const;

/* ═══════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════ */
export default function DesignPage() {
  return (
    <>
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🎨
            </span>
            <Title as="h1" className="!text-xl sm:!text-2xl">
              Chaty Design System
            </Title>
          </div>
          <ThemeSwitcherComponent />
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-8">
        {/* ═══ Typography ═══ */}
        <Section id="typography" title="Typography" description="Heading hierarchy and body text sizes.">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Text size="sm" className="text-muted-foreground">Title — heading levels</Text>
              <Title as="h1">h1 · The quick brown fox</Title>
              <Title as="h2">h2 · The quick brown fox</Title>
              <Title as="h3">h3 · The quick brown fox</Title>
              <Title as="h4">h4 · The quick brown fox</Title>
              <Title as="h5">h5 · The quick brown fox</Title>
              <Title as="h6">h6 · The quick brown fox</Title>
            </div>
            <hr className="border-border" />
            <div className="flex flex-col gap-2">
              <Text size="sm" className="text-muted-foreground">Text — body sizes</Text>
              <Text size="lg">Large · The quick brown fox jumps over the lazy dog.</Text>
              <Text size="base">Base · The quick brown fox jumps over the lazy dog.</Text>
              <Text size="sm">Small · The quick brown fox jumps over the lazy dog.</Text>
            </div>
          </div>
        </Section>

        {/* ═══ Buttons ═══ */}
        <Section id="buttons" title="Buttons" description="Three variants with consistent touch targets.">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary">Primary</Button>
              <Text size="sm" className="text-muted-foreground">primary</Text>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="secondary">Secondary</Button>
              <Text size="sm" className="text-muted-foreground">secondary</Text>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="ghost">Ghost</Button>
              <Text size="sm" className="text-muted-foreground">ghost</Text>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Text size="sm" className="text-muted-foreground">disabled</Text>
            </div>
          </div>
        </Section>

        {/* ═══ Form Elements ═══ */}
        <Section id="form-elements" title="Form Elements" description="Input, Select, and Form atoms.">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Input label="Username" placeholder="Enter your username" />
              <Input label="Email" type="email" placeholder="user@example.com" />
            </div>
            <div className="max-w-xs">
              <Select label="Select option" options={SELECT_OPTIONS} defaultValue="option-a" />
            </div>
            <Form
              className="rounded-lg border border-border bg-background p-6"
            >
              <Title as="h3">Form wrapper</Title>
              <Text size="sm" className="text-muted-foreground">
                The Form atom wraps native {'<form>'} with spacing.
              </Text>
              <Input label="Name" placeholder="Your name" />
              <div className="flex gap-3">
                <Button variant="primary" type="submit">
                  Submit
                </Button>
                <Button variant="ghost" type="reset">
                  Reset
                </Button>
              </div>
            </Form>
          </div>
        </Section>

        {/* ═══ Navigation ═══ */}
        <Section id="navigation" title="Navigation" description="Anchor component for internal and external links.">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <Text size="sm" className="text-muted-foreground">Internal</Text>
              <Anchor href="/design">Design System (internal)</Anchor>
            </div>
            <div className="flex flex-col gap-2">
              <Text size="sm" className="text-muted-foreground">External</Text>
              <Anchor href="https://nextjs.org" external>
                Next.js Docs (external)
              </Anchor>
            </div>
          </div>
        </Section>

        {/* ═══ Icons ═══ */}
        <Section id="icons" title="Icons" description="Icon atom with size variants. PoC uses emoji placeholders.">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {ICON_NAMES.map((name) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-3"
              >
                <Icon name={name} size="lg" />
                <Text size="sm" className="text-muted-foreground capitalize">
                  {name}
                </Text>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div className="flex flex-col items-center gap-1">
              <Icon name="star" size="sm" />
              <Text size="sm" className="text-muted-foreground">sm</Text>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icon name="star" size="md" />
              <Text size="sm" className="text-muted-foreground">md</Text>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icon name="star" size="lg" />
              <Text size="sm" className="text-muted-foreground">lg</Text>
            </div>
          </div>
        </Section>

        {/* ═══ Theme Colors ═══ */}
        <Section
          id="theme-colors"
          title="Theme Colors"
          description="Use the theme switcher in the header to toggle between Light, Dark, and Midnight. Swatches update live."
        >
          {/* Surface/Foreground pairs */}
          <Title as="h3" className="!text-lg mb-4">Surface &amp; Foreground Pairs</Title>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {SURFACE_PAIRS.map(({ label, bg, fg }) => (
              <Swatch key={label} label={label} bgVar={bg} fgVar={fg} />
            ))}
          </div>

          {/* Semantic action colors */}
          <Title as="h3" className="!text-lg mb-4">Semantic Colors</Title>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {SEMANTIC_COLORS.map(({ label, bg, fg }) => (
              <Swatch
                key={label}
                label={label}
                bgVar={bg}
                fgVar={fg ?? undefined}
              />
            ))}
          </div>

          {/* Border tokens */}
          <Title as="h3" className="!text-lg mb-4">Border Tokens</Title>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {BORDER_COLORS.map(({ label, bg }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-lg p-4"
                style={{ borderWidth: 2, borderColor: `var(${bg})` }}
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{bg}</span>
              </div>
            ))}
          </div>

          {/* Contrast demo */}
          <Title as="h3" className="!text-lg mb-4">Contrast Demo</Title>
          <div className="flex flex-col gap-3">
            {[
              { label: 'foreground on background', bg: 'var(--background)', fg: 'var(--foreground)' },
              { label: 'primary-foreground on primary', bg: 'var(--primary)', fg: 'var(--primary-foreground)' },
              { label: 'secondary-foreground on secondary', bg: 'var(--secondary)', fg: 'var(--secondary-foreground)' },
              { label: 'card-foreground on card', bg: 'var(--card)', fg: 'var(--card-foreground)' },
              { label: 'muted-foreground on muted', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
            ].map(({ label, bg, fg }) => (
              <div
                key={label}
                className="rounded-lg border border-border px-4 py-3"
                style={{ backgroundColor: bg, color: fg }}
              >
                <Text size="base" className="!text-inherit">
                  {label} — The quick brown fox jumps over the lazy dog.
                </Text>
              </div>
            ))}
          </div>
        </Section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-card px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Text size="sm" className="text-muted-foreground">
            Chaty Design System v0.1 — PoC
          </Text>
          <Anchor href="/" className="!text-sm">
            Back to Chaty
          </Anchor>
        </div>
      </footer>
    </>
  );
}
