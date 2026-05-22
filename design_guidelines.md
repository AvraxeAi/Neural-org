{
  "brand": {
    "product_name": "OpenClaw Command Center",
    "design_personality": [
      "cinematic",
      "powerful",
      "operator-first",
      "real-time",
      "tactile glass",
      "high-contrast",
      "not-corporate-SaaS"
    ],
    "north_star": "Feels like running an AI company in real time: a mission-control shell with glass panels, crisp typography, and stateful motion. Avoid ‘dashboard template’ vibes by using layered depth, asymmetric spacing, and canvas-first layouts (ReactFlow) with an inspector panel."
  },

  "inspiration_refs": {
    "visual": [
      {
        "title": "Dribbble — Dual Theme Liquid Glass UI",
        "url": "https://dribbble.com/shots/26007576-Dual-Theme-Liquid-Glass-UI-Light-Dark-in-Action",
        "takeaways": [
          "Liquid-glass edges (rim highlights)",
          "Layered translucent surfaces",
          "Cinematic contrast with minimal chroma accents"
        ]
      },
      {
        "title": "UXPlanet — Mission Control UX patterns",
        "url": "https://uxplanet.org/mission-control-software-ux-design-patterns-benchmarking-e8a2d802c1f3",
        "takeaways": [
          "Command-center shell: left nav + main workspace + contextual right panel",
          "Widget/feed patterns for ‘mission control’",
          "Operator workflows: quick actions + status visibility"
        ]
      }
    ],
    "glass_best_practices": [
      {
        "title": "Nielsen Norman Group — Glassmorphism best practices",
        "url": "https://www.nngroup.com/articles/glassmorphism/",
        "takeaways": [
          "Glass needs contrast + clear boundaries",
          "Avoid readability loss; use tint + borders",
          "Use sparingly and intentionally"
        ]
      }
    ],
    "canvas": [
      {
        "title": "React Flow examples",
        "url": "https://reactflow.dev/examples",
        "takeaways": [
          "Node-based editors patterns",
          "Mini-map, controls, background grid",
          "Custom nodes + overlays"
        ]
      }
    ]
  },

  "typography": {
    "font_pairing": {
      "display": {
        "name": "Space Grotesk",
        "weights": [500, 600, 700],
        "usage": "H1/H2, section titles, panel headers, key numbers"
      },
      "body": {
        "name": "IBM Plex Sans",
        "weights": [400, 500, 600],
        "usage": "Body, labels, tables, forms"
      },
      "mono": {
        "name": "IBM Plex Mono",
        "weights": [400, 500],
        "usage": "IDs, API keys, timestamps, execution logs"
      }
    },
    "implementation_notes_js": [
      "Use Google Fonts in index.html or via @import in index.css (preferred: <link> in public/index.html).",
      "Set Tailwind font families via CSS variables or tailwind.config if available; otherwise apply utility classes on layout root: font-[var(--font-body)]."
    ],
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl tracking-tight",
      "h2": "text-base md:text-lg text-muted-foreground",
      "panel_title": "text-sm font-semibold tracking-wide",
      "body": "text-sm md:text-base leading-relaxed",
      "meta": "text-xs text-muted-foreground",
      "mono": "font-mono text-xs"
    }
  },

  "color_system": {
    "mode": "dark-only",
    "palette_intent": "Deep near-black base with cool-cyan ‘systems’ accent and warm-amber ‘human decision’ accent. No purple. Glass panels use tinted charcoal with rim highlights.",
    "tokens_hsl_for_shadcn": {
      "root_dark": {
        "--background": "222 35% 6%",
        "--foreground": "210 25% 96%",
        "--card": "222 30% 8%",
        "--card-foreground": "210 25% 96%",
        "--popover": "222 30% 8%",
        "--popover-foreground": "210 25% 96%",
        "--primary": "190 95% 55%",
        "--primary-foreground": "222 35% 8%",
        "--secondary": "222 18% 14%",
        "--secondary-foreground": "210 25% 96%",
        "--muted": "222 18% 14%",
        "--muted-foreground": "215 14% 70%",
        "--accent": "190 60% 18%",
        "--accent-foreground": "210 25% 96%",
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "210 25% 96%",
        "--border": "220 18% 18%",
        "--input": "220 18% 18%",
        "--ring": "190 95% 55%",
        "--radius": "0.9rem"
      },
      "semantic_extras_css_vars": {
        "--surface-0": "hsla(222, 35%, 6%, 1)",
        "--surface-1": "hsla(222, 30%, 9%, 0.72)",
        "--surface-2": "hsla(222, 22%, 12%, 0.62)",
        "--rim": "hsla(190, 95%, 55%, 0.22)",
        "--rim-strong": "hsla(190, 95%, 55%, 0.35)",
        "--shadow-ambient": "0 20px 60px rgba(0,0,0,0.55)",
        "--shadow-elev": "0 10px 30px rgba(0,0,0,0.45)",
        "--glow-primary": "0 0 0 1px rgba(34,211,238,0.18), 0 0 24px rgba(34,211,238,0.10)",
        "--state-idle": "hsla(215, 14%, 70%, 0.9)",
        "--state-running": "hsla(190, 95%, 55%, 0.95)",
        "--state-completed": "hsla(160, 70%, 45%, 0.95)",
        "--state-failed": "hsla(0, 72%, 52%, 0.95)",
        "--state-warning": "hsla(38, 92%, 55%, 0.95)"
      }
    },
    "allowed_gradients": {
      "rule": "Gradients only as large background washes (<=20% viewport) or decorative overlays. Never on small UI elements or text-heavy panels.",
      "hero_wash": "radial-gradient(900px circle at 20% 10%, rgba(34,211,238,0.14), transparent 55%), radial-gradient(700px circle at 80% 20%, rgba(245,158,11,0.10), transparent 60%)",
      "canvas_wash": "radial-gradient(800px circle at 60% 40%, rgba(34,211,238,0.10), transparent 60%)"
    }
  },

  "layout": {
    "shell": {
      "structure": "Left rail sidebar + main workspace + right context inspector (slide-in). Optional top command bar for global search + realtime status.",
      "left_sidebar": {
        "collapsed_width": "w-16 to w-18 (64–72px)",
        "expanded_width": "w-[220px]",
        "behavior": [
          "Hover-expand on desktop optional; click-pin to keep expanded",
          "Active route uses glow + left indicator bar",
          "Bottom user block stays fixed"
        ]
      },
      "right_context_panel": {
        "width": "w-[340px] (320–360px)",
        "behavior": [
          "Slides in with Framer Motion",
          "Dismiss via Esc + close button",
          "Content is contextual: node/agent/thread/proposal"
        ]
      }
    },
    "grid_and_spacing": {
      "page_padding": "px-4 sm:px-6 lg:px-8",
      "vertical_rhythm": "space-y-6 (use 2–3x more spacing than default)",
      "bento": "Use 12-col grid on desktop; bento cards span 3–8 cols; avoid uniform card sizes.",
      "mobile_first": "On mobile: sidebar becomes Sheet (shadcn Sheet), context panel becomes Drawer."
    }
  },

  "glassmorphism_spec": {
    "no_transparent_backgrounds_rule": "Do not rely on true transparency over unknown backgrounds. Always render a solid base background (bg-background) and then glass panels as tinted overlays.",
    "panel_class_recipe": {
      "tailwind": "bg-[color:var(--surface-1)] backdrop-blur-xl border border-white/10 shadow-[var(--shadow-elev)]",
      "rim": "before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:ring-1 before:ring-[color:var(--rim)]",
      "notes": [
        "Use subtle border + rim highlight to define edges",
        "Avoid high-opacity blur that kills contrast",
        "Prefer rounded-2xl for major panels"
      ]
    },
    "elevation_levels": {
      "level_0": "bg-background",
      "level_1": "glass panel (surface-1) for sidebar + inspector",
      "level_2": "surface-2 for nested cards inside panels",
      "level_3": "popover/dialog uses surface-1 + stronger rim"
    }
  },

  "components": {
    "component_path": {
      "shadcn_ui": "/app/frontend/src/components/ui/",
      "use_these": [
        {"name": "button", "path": "src/components/ui/button.jsx"},
        {"name": "card", "path": "src/components/ui/card.jsx"},
        {"name": "badge", "path": "src/components/ui/badge.jsx"},
        {"name": "avatar", "path": "src/components/ui/avatar.jsx"},
        {"name": "tabs", "path": "src/components/ui/tabs.jsx"},
        {"name": "sheet", "path": "src/components/ui/sheet.jsx"},
        {"name": "drawer", "path": "src/components/ui/drawer.jsx"},
        {"name": "dialog", "path": "src/components/ui/dialog.jsx"},
        {"name": "dropdown-menu", "path": "src/components/ui/dropdown-menu.jsx"},
        {"name": "command", "path": "src/components/ui/command.jsx"},
        {"name": "scroll-area", "path": "src/components/ui/scroll-area.jsx"},
        {"name": "separator", "path": "src/components/ui/separator.jsx"},
        {"name": "tooltip", "path": "src/components/ui/tooltip.jsx"},
        {"name": "hover-card", "path": "src/components/ui/hover-card.jsx"},
        {"name": "resizable", "path": "src/components/ui/resizable.jsx"},
        {"name": "table", "path": "src/components/ui/table.jsx"},
        {"name": "sonner", "path": "src/components/ui/sonner.jsx"},
        {"name": "calendar", "path": "src/components/ui/calendar.jsx"}
      ]
    },
    "button_system": {
      "style": "Glass / action-first",
      "tokens": {
        "--btn-radius": "12px",
        "--btn-shadow": "0 10px 24px rgba(0,0,0,0.35)",
        "--btn-press-scale": "0.98"
      },
      "variants": {
        "primary": {
          "use": "Critical actions: Run workflow, Approve proposal, Create agent",
          "tailwind": "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[var(--glow-primary)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
          "micro": "On hover: subtle glow; on tap: scale to 0.98"
        },
        "secondary": {
          "use": "Neutral actions: Open panel, Save draft",
          "tailwind": "bg-[color:var(--surface-2)] text-foreground border border-white/10 hover:border-white/20 hover:bg-white/5"
        },
        "ghost": {
          "use": "Icon buttons in rails/toolbars",
          "tailwind": "bg-transparent hover:bg-white/5 text-foreground"
        },
        "danger": {
          "use": "Delete agent, revoke key",
          "tailwind": "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:brightness-110"
        }
      },
      "data_testid_rule": "Every Button must include data-testid (e.g., data-testid=\"workflow-run-button\")."
    },

    "navigation": {
      "left_rail": {
        "pattern": "Icon + label (label fades in when expanded). Active item has left indicator + glow.",
        "tailwind": "flex flex-col gap-1 p-2",
        "active_state": "bg-white/5 border border-white/10 shadow-[var(--glow-primary)]",
        "icons": "Use lucide-react icons (no emojis)."
      },
      "org_switcher": {
        "component": "dropdown-menu",
        "placement": "Top of sidebar",
        "notes": "Show org avatar + name; include search via Command inside Dropdown for multi-tenant scale."
      },
      "global_command_palette": {
        "component": "command",
        "trigger": "Cmd/Ctrl+K",
        "items": [
          "Jump to page",
          "Create proposal",
          "Start workflow",
          "Message agent",
          "Switch org"
        ]
      }
    },

    "cards_and_panels": {
      "panel": {
        "use": "Inspector, sidebar expanded, boardroom panels",
        "recipe": "relative rounded-2xl bg-[color:var(--surface-1)] backdrop-blur-xl border border-white/10"
      },
      "nested_card": {
        "use": "Agent cards, proposal cards, workflow run logs",
        "recipe": "rounded-xl bg-[color:var(--surface-2)] border border-white/10 hover:border-white/20"
      },
      "badges": {
        "use": "Board member, agent type, status",
        "states": {
          "running": "bg-cyan-500/15 text-cyan-200 border border-cyan-400/20",
          "completed": "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20",
          "failed": "bg-red-500/15 text-red-200 border border-red-400/20",
          "warning": "bg-amber-500/15 text-amber-200 border border-amber-400/20"
        }
      }
    },

    "data_display": {
      "tables": {
        "component": "table",
        "notes": "Use sticky header inside ScrollArea for proposals/workflow runs. Row hover uses bg-white/3."
      },
      "charts": {
        "library": "recharts",
        "use_cases": [
          "Dashboard: activity over time",
          "Workflow success/failure rate",
          "Agent utilization"
        ],
        "styling": "Dark gridlines (white/8), cyan line, amber highlights for decisions."
      }
    },

    "forms": {
      "components": ["form", "input", "textarea", "select", "checkbox", "switch"],
      "rules": [
        "Inputs use surface-2 background + border-white/10",
        "Focus ring uses --ring (cyan)",
        "API key fields use mono font + copy button"
      ]
    },

    "overlays": {
      "dialogs": "dialog",
      "sheets": "sheet",
      "drawers": "drawer",
      "toasts": "sonner",
      "notes": "Overlays should feel like ‘systems UI’: fast, crisp, minimal copy."
    }
  },

  "page_blueprints": {
    "auth": {
      "layout": "Split-screen: left is cinematic brand panel (subtle gradient wash + noise), right is glass card form.",
      "details": [
        "Left panel shows tagline + 2–3 bullet capabilities",
        "Right panel uses Card + Form",
        "Include SSO placeholders (MOCKED if not implemented)"
      ],
      "testids": [
        "login-email-input",
        "login-password-input",
        "login-submit-button",
        "register-submit-button"
      ]
    },
    "dashboard": {
      "layout": "Bento grid + live feed column. Avoid symmetrical ‘analytics dashboard’.",
      "modules": [
        "Live Activity Feed (ScrollArea)",
        "Active Workflows (compact list with status pills)",
        "Recent Proposals (timeline)",
        "Quick Actions (icon tiles)",
        "Org Pulse (Recharts line)"
      ]
    },
    "org_chart": {
      "canvas": "ReactFlow full-bleed inside workspace with subtle grid + vignette.",
      "node_design": {
        "shape": "rounded-2xl glass chip",
        "content": "Avatar + name + role + status dot + message icon",
        "board_badge": "Badge top-right",
        "states": {
          "selected": "ring-2 ring-cyan-400/40 shadow-[var(--glow-primary)]",
          "hover": "translate-y-[-1px] border-white/20"
        }
      },
      "interactions": [
        "Drag-and-drop hierarchy",
        "Zoom/pan controls",
        "Node click opens inspector",
        "Message button opens Messages thread"
      ]
    },
    "workflows": {
      "canvas": "ReactFlow node editor like n8n; left palette (Collapsible) + main canvas + right inspector.",
      "execution_overlay": "Each node shows state stripe + small progress indicator (Progress component) when running.",
      "palette": ["Trigger", "Step", "Branch", "Parallel", "Output"]
    },
    "boardroom": {
      "layout": "Three-column: proposals timeline (left), debate thread (center), voting + outcome (right inspector).",
      "voting": "Approve/Reject buttons with confirmation AlertDialog."
    },
    "messages": {
      "layout": "Two-pane: thread list (left) + chat (center) + optional inspector (right).",
      "chat_bubbles": "Use surface-2 for user, surface-1 for agent; timestamps in mono.",
      "composer": "Textarea + attachments (if any) + send button; sticky at bottom."
    },
    "agents": {
      "layout": "Agent grid (cards) + detail editor in right inspector.",
      "editor": "Tabs: Prompt / Skills / Tools / Keys / Runs",
      "api_key": "Masked input + reveal toggle + copy button"
    },
    "settings": {
      "layout": "Tabs with sections; avoid long forms—use grouped Cards.",
      "sections": ["Org", "Members", "Billing (MOCKED)", "Profile", "Security"]
    }
  },

  "motion": {
    "library": "framer-motion",
    "principles": [
      "Motion communicates state changes (open/close, selection, execution)",
      "Prefer opacity + y (2–6px) + blur(2px) for entrances",
      "No constant looping animations except subtle background noise"
    ],
    "durations": {
      "fast": "0.12–0.18s",
      "base": "0.22–0.32s",
      "slow": "0.45–0.7s (route transitions only)"
    },
    "easings": {
      "standard": "[0.22, 1, 0.36, 1]",
      "snappy": "[0.2, 0.9, 0.2, 1]"
    },
    "recipes": {
      "panel_slide_in": "initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}",
      "card_hover": "whileHover={{ y: -2 }} transition={{ duration: 0.16 }}",
      "node_select_pulse": "Use box-shadow glow change (no scale) to avoid canvas jitter"
    }
  },

  "reactflow_theming": {
    "canvas": {
      "background": "Use ReactFlow Background with low-contrast dots/lines: color=rgba(255,255,255,0.06)",
      "controls": "Style controls as glass mini-panel (surface-1) with icon buttons",
      "minimap": "Optional; if used, keep tiny and tinted"
    },
    "node_types": {
      "org_node": "Glass card with avatar + status",
      "workflow_node": "Type header strip + body + state overlay"
    },
    "edges": {
      "default": "stroke rgba(34,211,238,0.35)",
      "inactive": "stroke rgba(255,255,255,0.10)",
      "animated_running": "animated edge with cyan dash (subtle)"
    }
  },

  "accessibility": {
    "contrast": [
      "Never place low-contrast text on glass; increase tint or use solid surface-2",
      "Use text-foreground for primary text; muted only for metadata"
    ],
    "focus": "All interactive elements must have visible focus (focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]).",
    "reduced_motion": "Respect prefers-reduced-motion: disable parallax and reduce entrance animations.",
    "keyboard": [
      "Cmd/Ctrl+K opens Command palette",
      "Esc closes dialogs/sheets/inspector",
      "Tab order: sidebar -> workspace -> inspector"
    ]
  },

  "images": {
    "image_urls": [
      {
        "category": "auth-left-panel-background",
        "description": "Subtle cinematic glass texture behind login/register split panel (apply with overlay + blur; keep readable).",
        "url": "https://images.unsplash.com/photo-1564934304075-d24ebbbde6f9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNDR8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjBnbGFzcyUyMHRleHR1cmUlMjBiYWNrZ3JvdW5kfGVufDB8fHx0ZWFsfDE3Nzk0MDkzMjR8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "app-shell-noise-overlay",
        "description": "Very subtle grain/noise overlay (opacity 0.04–0.07) to avoid flat dark UI.",
        "url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbm9pc2UlMjB0ZXh0dXJlJTIwb3ZlcmxheXxlbnwwfHx8YmxhY2t8MTc3OTQwOTMzMXww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "empty-state-illustration-reference",
        "description": "Use as a reference mood image for empty states (do not overuse). Prefer simple inline SVGs tinted cyan/white.",
        "url": "https://images.pexels.com/photos/7562103/pexels-photo-7562103.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      }
    ]
  },

  "implementation_notes": {
    "instructions_to_main_agent": [
      "Update /app/frontend/src/index.css tokens: set :root to dark tokens OR force .dark on html/body and replace .dark values with the provided HSL tokens. App is dark-only.",
      "Remove any centered App header styling from App.css usage; do not apply text-align:center to containers.",
      "Create a reusable ‘GlassPanel’ wrapper component (JS) that applies the panel recipe + rim pseudo-element.",
      "All interactive elements MUST include data-testid in kebab-case describing role (e.g., data-testid=\"sidebar-nav-dashboard\").",
      "Use shadcn Sheet for mobile sidebar and Drawer for mobile inspector.",
      "Use Sonner for toasts (already in ui/sonner.jsx).",
      "ReactFlow: implement custom nodes for Org + Workflow with the specified states and overlays.",
      "Avoid gradients except the allowed background washes (<=20% viewport). No purple gradients anywhere."
    ],
    "extra_libraries": [
      {
        "name": "framer-motion",
        "why": "Cinematic panel transitions, route transitions, hover depth",
        "install": "npm i framer-motion",
        "usage_snippet_js": "import { motion, AnimatePresence } from 'framer-motion';"
      },
      {
        "name": "recharts",
        "why": "Dashboard pulse charts",
        "install": "npm i recharts",
        "usage_snippet_js": "import { LineChart, Line, ResponsiveContainer } from 'recharts';"
      }
    ],
    "css_scaffolds": {
      "noise_overlay": "Add a fixed pseudo-element on body or #root: background-image:url(NOISE_URL); mix-blend-mode: overlay; opacity:0.05; pointer-events:none;",
      "selection": "::selection { background: rgba(34,211,238,0.25); color: white; }"
    }
  },

  "GRADIENT_RESTRICTION_RULE": {
    "rules": [
      "NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element. Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc",
      "NEVER use dark gradients for logo, testimonial, footer etc",
      "NEVER let gradients cover more than 20% of the viewport.",
      "NEVER apply gradients to text-heavy content or reading areas.",
      "NEVER use gradients on small UI elements (<100px width).",
      "NEVER stack multiple gradient layers in the same viewport.",
      "IF gradient area exceeds 20% of viewport OR affects readability, THEN use solid colors"
    ],
    "allowed_usage": [
      "Section backgrounds (not content backgrounds)",
      "Hero section header content. Eg: dark to light to dark color",
      "Decorative overlays and accent elements only",
      "Hero section with 2-3 mild color",
      "Gradients creation can be done for any angle say horizontal, vertical or diagonal"
    ]
  },

  "General_UI_UX_Design_Guidelines": [
    "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms",
    "- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text",
    "- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json",
    "\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
  ]
}
