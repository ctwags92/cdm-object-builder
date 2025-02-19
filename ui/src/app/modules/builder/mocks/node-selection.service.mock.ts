import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { JsonNode } from '../models/builder.model';

@Injectable()
export class NodeSelectionServiceMock {
  private selectedNode$ = new BehaviorSubject<JsonNode | null>(null);

  getSelectedNode() {
    return this.selectedNode$;
  }

  selectAndScrollToNode(node: JsonNode) {
    this.selectedNode$.next(node);
  }
}
