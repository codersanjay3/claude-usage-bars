# usage-bars

A Claude Code mod that draws two bars right above the prompt: your usage limit (5-hour window, with time until reset) and your context window, each with a percentage. Bars turn yellow at 60% and red at 85%.

## Install

At the prompt of a terminal session:

```
/plugin install usage-bars --marketplace codersanjay3/claude-usage-bars
```

From a shell:

```
claude plugin install usage-bars --marketplace codersanjay3/claude-usage-bars
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `codersanjay3/claude-usage-bars`, then Add plugin.

With an API key (no subscription) no limit is reported, so the usage bar shows `--%`.
