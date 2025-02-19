import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { JsonNode, JsonRootNode, RosettaTypeCategory } from '../models/builder.model';

export interface NodeDataChangeEvent {
  rootNode: JsonRootNode;
  nodeToExpand?: JsonNode;
}

@Injectable()
export class NodeDatabaseServiceMock {
  nodeDataChange$ = new ReplaySubject<NodeDataChangeEvent>(1);

  constructor() {
    this.nodeDataChange$.next({
      rootNode: {
        type: {
          name: 'Root',
          namespace: 'test',
          typeCategory: RosettaTypeCategory.StructuredType
        },
        children: []
      } as JsonRootNode
    });
  }

  getLineage(node: JsonNode): JsonNode[] {
    return [node];
  }
}
