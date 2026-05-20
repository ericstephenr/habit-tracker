class MenuState {
  openId = $state<string | null>(null);

  isOpen(id: string): boolean {
    return this.openId === id;
  }

  open(id: string): void {
    this.openId = id;
  }

  close(): void {
    this.openId = null;
  }
}

export const menuState = new MenuState();
