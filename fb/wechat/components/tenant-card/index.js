Component({
  properties: {
    tenant: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onCardTap() {
      if (this.data.tenant.is_empty) return;
      this.triggerEvent('cardTap', { tenant: this.data.tenant });
    }
  }
}); 