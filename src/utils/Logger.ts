import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;

  constructor(private context: string) {}

  info(message: string): void {
    console.log(chalk.cyan(`[info] `) + chalk.dim(message));
  }

  success(message: string): void {
    console.log(chalk.green.bold(`✔ `) + chalk.bold(message));
  }

  warn(message: string): void {
    console.warn(chalk.yellow.bold(`⚠ `) + chalk.yellow(message));
  }

  error(message: string, error?: unknown): void {
    console.error(chalk.red.bold(`✖ `) + chalk.red(message));
    if (error) console.error(error);
  }

  startSpinner(message: string): void {
    this.spinner = ora({
        text: chalk.blue(message),
        color: 'blue'
    }).start();
  }

  stopSpinner(success = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message ? chalk.green(message) : undefined);
      } else {
        this.spinner.fail(message ? chalk.red(message) : undefined);
      }
      this.spinner = null;
    }
  }
}
